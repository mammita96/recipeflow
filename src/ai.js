/* RecipeFlow — Google Gemini (piano gratuito) con ricerca Google. */
'use strict';
(function () {
  const RF = window.RF;
  const DEFAULT_MODEL = 'gemini-3.5-flash-lite', FALLBACK_MODEL = 'gemini-2.5-flash';
  const LANGS = [['it', 'Italiano', 'Italian'], ['en', 'English', 'English'], ['es', 'Español', 'Spanish'], ['fr', 'Français', 'French'], ['de', 'Deutsch', 'German'], ['pt', 'Português', 'Portuguese']];
  const langEnglish = c => (LANGS.find(l => l[0] === c) || LANGS[0])[2];

  class Ai {
    constructor(key, model, lang) {
      this.key = (key || '').trim();
      this.model = (model || '').trim() || DEFAULT_MODEL;
      this.lang = lang || 'it';
    }
    get ready() { return !!this.key; }

    async generate(system, prompt, { maxTokens = 2000, json = false, search = false, model = null } = {}) {
      try { return await this.call(system, prompt, maxTokens, json, search, model); }
      catch (e) {
        const m = model || this.model;
        if (String(e.message).startsWith('Gemini 404') && m !== FALLBACK_MODEL) return this.call(system, prompt, maxTokens, json, search, FALLBACK_MODEL);
        throw e;
      }
    }

    async call(system, prompt, maxTokens, json, search, modelOverride) {
      if (!this.key) throw new Error('Inserisci la chiave gratuita di Gemini in Altro → Impostazioni.');
      const m = modelOverride || this.model;
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: Object.assign({ maxOutputTokens: Math.max(4096, maxTokens * 3) }, json ? { responseMimeType: 'application/json' } : {})
      };
      if (search) body.tools = [{ google_search: {} }];
      let resp;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 120000);
      try {
        resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.key }, body: JSON.stringify(body), signal: ctrl.signal
        });
      } catch (e) {
        throw new Error(e.name === 'AbortError' ? 'Gemini non ha risposto in tempo: riprova.' : 'Sembra che non ci sia connessione a internet.');
      } finally { clearTimeout(timer); }
      const text = await resp.text();
      let root = {};
      try { root = JSON.parse(text); } catch (e) { }
      if (resp.status === 429) throw new Error('Limite del piano gratuito Gemini raggiunto: riprova tra un minuto (o domani se è il limite giornaliero).');
      if (resp.status !== 200) {
        let msg = (root.error && root.error.message) || text.slice(0, 200);
        if (resp.status === 400 && /api key/i.test(msg)) msg = 'chiave non valida. Controllala nelle Impostazioni.';
        if (resp.status === 404) msg += ' — controlla il nome del modello nelle Impostazioni.';
        throw new Error(`Gemini ${resp.status}: ${msg}`);
      }
      const cand = (root.candidates || [])[0];
      if (!cand) throw new Error('Gemini non ha restituito risposte (contenuto bloccato o vuoto).');
      const out = ((cand.content && cand.content.parts) || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
      if (!out) throw new Error(`Risposta vuota da Gemini (motivo: ${cand.finishReason || '?'}).`);
      const sources = [];
      for (const ch of ((cand.groundingMetadata && cand.groundingMetadata.groundingChunks) || [])) {
        if (ch.web && ch.web.uri) sources.push([ch.web.title || ch.web.uri, ch.web.uri]);
      }
      return { text: out, sources, web: search };
    }

    /** Prova con la ricerca Google (modello scelto, poi gemini-2.5-flash); se non è disponibile risponde senza. */
    async askWeb(system, prompt, maxTokens, progress, what) {
      if (!this.key) throw new Error('Inserisci la chiave gratuita di Gemini in Altro → Impostazioni.');
      const models = [this.model];
      if (!models.includes(FALLBACK_MODEL)) models.push(FALLBACK_MODEL);
      for (const m of models) {
        try {
          progress && progress(`Cerco ${what} su Google…`);
          return await this.call(system, prompt, maxTokens, false, true, m);
        } catch (e) {
          if (String(e.message).includes('chiave non valida') || String(e.message).includes('connessione')) throw e;
        }
      }
      progress && progress(`Ricerca Google non disponibile: chiedo all'AI ${what}…`);
      return this.generate(system.replace('Search the web for', 'From your knowledge, think of'), prompt, { maxTokens, json: true });
    }

    static extractJson(text) {
      const a = text.indexOf('{'), b = text.lastIndexOf('}');
      if (a < 0 || b <= a) throw new Error('La risposta dell\'AI non è nel formato atteso: riprova.');
      try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { throw new Error('La risposta dell\'AI era incompleta: riprova.'); }
    }

    static recipeFromJson(j, lang) {
      const r = RF.normRecipe({
        id: 'r-' + Date.now().toString(36), lang, title: j.title || 'Ricetta', description: j.description || '', servings: Math.max(1, Math.round(+j.servings || 2)),
        minutes: Math.round(+j.minutes || 0), popularity: 55, source: 'Web', tags: (j.tags || []).map(String), steps: (j.steps || []).map(String)
      });
      for (const o of (j.ingredients || [])) {
        const name = String(o.name || '').trim();
        if (!name) continue;
        r.ingredients.push(RF.ingredient(name, +o.amount || 0, o.unit || '', +o.grams || 0, o.en || ''));
      }
      return r;
    }

    async webRecipe(query, progress) {
      const L = langEnglish(this.lang);
      const system = 'You are an expert recipe researcher and chef. The user names a dish. Search the web for well-rated, popular recipes of that dish '
        + '(prefer reliable cooking sites and, for Italian dishes, authoritative Italian sources). Read at least 3 different recipes, compare them, '
        + 'and write ONE recipe that combines the best of them: the ingredients and proportions most sources agree on, and the best technique.\n'
        + `Write everything in ${L}. Reply ONLY with valid JSON, no markdown, no text before or after:\n`
        + '{"title": "...", "description": "1-2 sentences about the dish", "servings": number, "minutes": number, "tags": ["..."],\n'
        + ' "ingredients": [{"name": "...", "en": "ingredient name in English", "amount": number, "unit": "g|ml|pz|cucchiaio|cucchiaino|q.b.", "grams": estimated grams}],\n'
        + ' "steps": ["clear step with times in minutes", "..."],\n'
        + ' "notes": "1-3 sentences: how the sources differ and why you chose this version",\n'
        + ' "sources_used": [{"title": "site name", "url": "https://..."}]}\n'
        + 'Units must be one of: g, ml, pz, cucchiaio, cucchiaino, q.b. (Italian words even if writing in another language).\n'
        + 'Tags may include: Virale (if the dish is a social media trend), Veloce, Vegetariana, Vegana, Carne, Pesce, Dolce, Colazione, Basi.';
      const res = await this.askWeb(system, 'Dish: ' + query, 4000, progress, `«${query}» e confronto le ricette`);
      progress && progress('Scrivo la ricetta…');
      const j = Ai.extractJson(res.text);
      const r = Ai.recipeFromJson(j, this.lang);
      r.id = 'web-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      r.source = res.web ? 'Web (Google)' : 'AI, senza ricerca web';
      r.notes = j.notes || '';
      const src = new Map();
      for (const [t, u] of res.sources) if (u && !src.has(u)) src.set(u, t);
      if (!src.size) for (const o of (j.sources_used || [])) if (o && String(o.url || '').startsWith('http') && !src.has(o.url)) src.set(o.url, o.title || o.url);
      r.sources = [...src.entries()].slice(0, 8).map(([u, t]) => t + '|' + u);
      if (r.sources.length) r.sourceUrl = r.sources[0].slice(r.sources[0].indexOf('|') + 1);
      if (!r.tags.includes('Dal web')) r.tags.unshift('Dal web');
      return r;
    }

    async ideas(request, n, progress) {
      const system = 'You suggest home-cooking recipes. Search the web for real, popular, well-rated recipes that match the user\'s request.\n'
        + `Give ${n} varied ideas (different cuisines and techniques, not all pasta). Write in ${langEnglish(this.lang)}. Reply ONLY with valid JSON, no markdown:\n`
        + '{"ideas": [{"title": "dish name", "description": "one appetising sentence", "minutes": number,\n'
        + '  "uses": ["ingredients from the user\'s list it uses"], "missing": ["main ingredients the user would need to buy"],\n'
        + '  "search": "short query to find this exact recipe online"}]}\n'
        + 'Ignore salt, pepper, oil and water when listing missing ingredients.';
      const res = await this.askWeb(system, request, 2500, progress, 'idee');
      const out = (Ai.extractJson(res.text).ideas || []).map(o => ({
        title: o.title || 'Ricetta', description: o.description || '', search: o.search || o.title || '', minutes: Math.round(+o.minutes || 0),
        uses: (o.uses || []).map(String), missing: (o.missing || []).map(String)
      }));
      if (!out.length) throw new Error('Nessuna idea trovata: prova a cambiare richiesta.');
      return out;
    }

    async weekMenu(household, fridge, wishes, progress) {
      const system = `You are a home cook planning a varied, balanced week of meals for a household of ${Math.max(1, household)}. Write dish names in ${langEnglish(this.lang)}.\n`
        + 'Rules: no dish repeated; balance pasta/rice, meat, fish, legumes, eggs and vegetarian dishes; lighter dinners after rich lunches;\n'
        + 'weekday meals mostly under 40 minutes; include 1-2 popular/viral dishes. Use the ingredients the user already has when sensible.\n'
        + 'Reply ONLY with valid JSON: {"days": [{"lunch": "dish", "dinner": "dish"}, ... exactly 7 items, Monday first]}';
      let p = 'Plan my week.';
      if (fridge.length) p += ' Ingredients I already have: ' + fridge.join(', ') + '.';
      if (wishes) p += ' Wishes: ' + wishes;
      progress && progress('Preparo il menù della settimana…');
      const j = Ai.extractJson((await this.generate(system, p, { maxTokens: 1500, json: true })).text);
      const out = (j.days || []).map(d => [d.lunch || '', d.dinner || '']);
      if (!out.length) throw new Error('Il menù non è arrivato completo: riprova.');
      return out;
    }

    async coach(r) {
      const L = langEnglish(this.lang);
      const system = `You are an expert chef specialised in healthy home cooking and practical nutrition. Always answer in ${L}, concise and concrete.\n`
        + 'Do not give medical advice or diets: suggest common-sense culinary changes suitable for a healthy adult.\n'
        + `Plain text only (no markdown symbols like # or **). Use these four section titles, in UPPERCASE and translated into ${L}:\n`
        + '1) SUBSTITUTIONS: 3-5 concrete swaps, with quantities, why they work and estimated kcal saved per serving\n'
        + '2) TO COMPLETE THE MEAL: 2-3 additions (vegetables, protein, fibre) with quantity per serving\n'
        + '3) COOKING: 2 technique tips to use less fat without losing flavour\n'
        + '4) LIGHT VERSION AT A GLANCE: revised ingredient list with quantities, and estimated kcal per serving before → after\n'
        + 'Start each list item with "- ".';
      const t = (await this.generate(system, 'Make this recipe lighter and more complete while keeping its character.\n\n' + Ai.describe(r), { maxTokens: 1800 })).text;
      return t.replace(/\*\*/g, '').replace(/^#+\s*/gm, '');
    }

    async importText(text) {
      const L = langEnglish(this.lang);
      const system = `Extract a cooking recipe from the given text (it may be a social media caption, a video transcript or a web page). Write everything in ${L}.\n`
        + 'Reply ONLY with valid JSON:\n'
        + '{"title": "...", "description": "1-2 sentences", "servings": number, "minutes": number, "tags": ["..."],\n'
        + ' "ingredients": [{"name": "...", "en": "ingredient name in English", "amount": number, "unit": "g|ml|pz|cucchiaio|cucchiaino|q.b.", "grams": number}],\n'
        + ' "steps": ["step 1", "..."]}\n'
        + 'If quantities are missing, estimate them realistically. Steps must be clear and state times in minutes when possible.';
      const r = Ai.recipeFromJson(Ai.extractJson((await this.generate(system, text, { maxTokens: 3000, json: true })).text), this.lang);
      r.id = 'my-' + Date.now().toString(36);
      r.source = 'Importata';
      if (!r.tags.includes('Importata')) r.tags.unshift('Importata');
      return r;
    }

    static describe(r) {
      let s = `Recipe: ${r.title} (${r.servings} servings)\n`;
      if (r.tags.length) s += 'Tags: ' + r.tags.join(', ') + '\n';
      s += 'Ingredients:\n' + r.ingredients.map(i => `- ${i.name}: ${RF.quantityLabel(i)}`).join('\n') + '\nSteps:\n' + r.steps.map((st, k) => `${k + 1}. ${st}`).join('\n');
      const n = RF.perServing(r);
      return s + `\nPer serving: ${Math.round(n.kcal)} kcal, protein ${Math.round(n.prot)} g, carbs ${Math.round(n.carb)} g (sugar ${Math.round(n.sug)} g), fat ${Math.round(n.fat)} g (saturated ${Math.round(n.sat)} g), fibre ${Math.round(n.fib)} g`;
    }

    static stableHash(s) {
      let h = 5381n;
      for (const b of new TextEncoder().encode(s)) h = (h * 33n + BigInt(b)) & 0xFFFFFFFFFFFFFFFFn;
      return h.toString(16);
    }

    /** Ricetta segnaposto per un'idea: la ricetta completa si prepara solo quando serve. */
    static stub(title, description, query, minutes) {
      const q = (query || '').trim() || title;
      return RF.normRecipe({ id: 'idea-' + Ai.stableHash(q.toLowerCase()), title, description: description || '', kind: 'idea:' + q, minutes: minutes || 0, source: 'Idea dal web', servings: 2, tags: ['Dal web'] });
    }
    static isStub(r) { return r.kind.startsWith('idea:') && !r.ingredients.length; }
  }

  Object.assign(RF, { Ai, LANGS, DEFAULT_MODEL });
})();
