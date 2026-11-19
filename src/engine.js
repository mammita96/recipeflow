/* RecipeFlow — motori: alimenti, versione leggera, impasti, frigo, passaggi. Tutto offline. */
'use strict';

const RF = window.RF = window.RF || {};

// ===================== ALIMENTI =====================
const DISPENSA = 'Dispensa', FRESCO = 'Frigo e latticini', ORTO = 'Frutta e verdura', CARNE = 'Carne e pesce', FORNO = 'Pane e forno', SPEZIE = 'Spezie e condimenti';
const AISLE = { DISPENSA, FRESCO, ORTO, CARNE, FORNO, SPEZIE };
const AISLES = [ORTO, CARNE, FRESCO, FORNO, DISPENSA, SPEZIE, 'Altro'];

const FOOD_DATA = [
  ["gamberi", "Gamberi", "CARNE", 15, 85, 18, 0.5, 0, 1, 0.2, 0, ["gamber", "mazzancoll", "scampi", "shrimp", "prawn"]],
  ["calamari", "Calamari e seppie", "CARNE", 0, 92, 15.6, 3, 0, 1.4, 0.4, 0, ["calamar", "totan", "seppi", "squid", "cuttlefish"]],
  ["polpo", "Polpo", "CARNE", 0, 82, 15, 2.2, 0, 1, 0.2, 0, ["polpo", "polipo", "octopus"]],
  ["cozze", "Cozze e vongole", "CARNE", 0, 86, 12, 3.7, 0, 2.2, 0.4, 0, ["cozz", "vongol", "mussel", "clam", "frutti di mare"]],
  ["pesce_bianco", "Pesce bianco", "CARNE", 150, 85, 18, 0, 0, 1.2, 0.3, 0, ["merluzz", "baccal", "nasello", "orata", "branzino", "spigola", "platessa", "sogliola", "cod", "sea bass", "pesce spada"]],
  ["acciughe", "Acciughe", "CARNE", 4, 210, 29, 0, 0, 10, 2, 0, ["acciug", "alici", "anchov"]],
  ["prosciutto_crudo", "Prosciutto crudo", "CARNE", 15, 250, 26, 0, 0, 16, 5.5, 0, ["prosciutto crudo", "prosciutto di parma", "prosciutto", "prosciutto san daniele", "jamon", "prosciutto crudo"]],
  ["speck", "Speck", "CARNE", 15, 300, 28, 0.5, 0, 20.9, 7, 0, ["speck"]],
  ["bresaola", "Bresaola", "CARNE", 10, 151, 32, 0.4, 0, 2.6, 1, 0, ["bresaola"]],
  ["mortadella", "Mortadella", "CARNE", 15, 311, 15, 1, 0, 27, 9, 0, ["mortadell"]],
  ["salame", "Salame", "CARNE", 8, 400, 26, 1, 0, 32, 11, 0, ["salame", "salami", "chorizo", "nduja", "'nduja", "salamino"]],
  ["wurstel", "Würstel", "CARNE", 50, 270, 13, 2, 1, 23, 8.5, 0, ["wurstel", "würstel", "hot dog", "frankfurter"]],
  ["tacchino", "Tacchino", "CARNE", 0, 107, 24, 0, 0, 1.2, 0.4, 0, ["tacchin", "turkey"]],
  ["maiale", "Maiale", "CARNE", 180, 157, 21, 0, 0, 8, 2.8, 0, ["maiale", "lonza", "braciol", "costin", "pork", "arista", "filetto di maiale"]],
  ["vitello", "Vitello", "CARNE", 0, 107, 20.7, 0, 0, 2.7, 1, 0, ["vitello", "veal", "fesa"]],
  ["agnello", "Agnello", "CARNE", 0, 160, 20, 0, 0, 9, 4, 0, ["agnell", "abbacchio", "lamb"]],
  ["pollo_coscia", "Cosce di pollo", "CARNE", 130, 160, 19, 0, 0, 9, 2.6, 0, ["coscia di pollo", "cosce di pollo", "sovracosc", "fusi di pollo", "chicken thigh", "chicken leg", "alette"]],
  ["zucca", "Zucca", "ORTO", 0, 26, 1, 6.5, 2.8, 0.1, 0, 0.5, ["zucca", "pumpkin", "squash"]],
  ["piselli", "Piselli", "ORTO", 0, 81, 5.4, 14.5, 5.7, 0.4, 0.1, 5.1, ["pisell", "peas"]],
  ["fagioli", "Fagioli (cotti)", "DISPENSA", 0, 127, 8.7, 22.8, 0.3, 0.5, 0.1, 6.4, ["fagiol", "cannellini", "borlotti", "beans", "kidney"]],
  ["fagiolini", "Fagiolini", "ORTO", 0, 31, 1.8, 7, 3.3, 0.2, 0, 2.7, ["fagiolini", "green beans", "cornetti"]],
  ["cavolo", "Cavolfiore e cavoli", "ORTO", 0, 25, 1.9, 5, 1.9, 0.3, 0.1, 2, ["cavolfior", "cavol", "verza", "cauliflower", "cabbage", "kale", "romanesco"]],
  ["asparagi", "Asparagi", "ORTO", 20, 20, 2.2, 3.9, 1.9, 0.1, 0, 2.1, ["asparag"]],
  ["porro", "Porro", "ORTO", 150, 61, 1.5, 14, 3.9, 0.3, 0, 1.8, ["porro", "porri", "leek"]],
  ["carciofi", "Carciofi", "ORTO", 120, 47, 3.3, 10.5, 1, 0.2, 0, 5.4, ["carciof", "artichoke"]],
  ["finocchio", "Finocchio", "ORTO", 250, 31, 1.2, 7, 3.9, 0.2, 0, 3.1, ["finocch", "fennel"]],
  ["mais", "Mais", "DISPENSA", 0, 86, 3.3, 19, 6.3, 1.4, 0.3, 2.7, ["mais", "corn", "pannocchi"]],
  ["patate_dolci", "Patate dolci", "ORTO", 200, 86, 1.6, 20, 4.2, 0.1, 0, 3, ["patata dolce", "patate dolci", "patate americane", "sweet potato"]],
  ["olive", "Olive", "DISPENSA", 4, 145, 1, 3.8, 0, 15, 2, 3.3, ["olive", "taggiasch", "kalamata"]],
  ["capperi", "Capperi", "DISPENSA", 0, 23, 2.4, 4.9, 0.4, 0.9, 0.2, 3.2, ["capper", "caper"]],
  ["mela", "Mela", "ORTO", 180, 52, 0.3, 14, 10, 0.2, 0, 2.4, ["mela", "mele", "apple"]],
  ["pera", "Pera", "ORTO", 170, 57, 0.4, 15, 10, 0.1, 0, 3.1, ["pera", "pere", "pear"]],
  ["arancia", "Arancia", "ORTO", 200, 47, 0.9, 12, 9, 0.1, 0, 2.4, ["aranc", "orange", "mandarin", "clementin"]],
  ["fragole", "Fragole", "ORTO", 15, 32, 0.7, 7.7, 4.9, 0.3, 0, 2, ["fragol", "strawberr"]],
  ["uvetta", "Uvetta", "DISPENSA", 0, 299, 3, 79, 59, 0.5, 0, 3.7, ["uvetta", "uva sultanina", "raisin"]],
  ["datteri", "Datteri", "DISPENSA", 8, 282, 2.5, 75, 63, 0.4, 0, 8, ["datter", "dates"]],
  ["noci", "Noci", "DISPENSA", 5, 654, 15, 14, 2.6, 65, 6, 6.7, ["noci", "gherigli", "walnut", "pecan"]],
  ["mandorle", "Mandorle", "DISPENSA", 1.2, 579, 21, 22, 4.4, 50, 3.8, 12.5, ["mandorl", "almond"]],
  ["nocciole", "Nocciole", "DISPENSA", 1.5, 628, 15, 17, 4.3, 61, 4.5, 9.7, ["nocciol", "hazelnut"]],
  ["pinoli", "Pinoli", "DISPENSA", 0, 673, 14, 13, 3.6, 68, 4.9, 3.7, ["pinol", "pine nut"]],
  ["pistacchi", "Pistacchi", "DISPENSA", 0, 560, 20, 28, 7.7, 45, 5.9, 10.6, ["pistacch", "pistachio"]],
  ["arachidi", "Arachidi", "DISPENSA", 0, 567, 26, 16, 4, 49, 6.8, 8.5, ["arachid", "noccioline", "peanut"]],
  ["semi", "Semi (chia, lino, girasole, zucca)", "DISPENSA", 0, 520, 20, 30, 1, 40, 4, 25, ["semi di", "semi di chia", "chia seed", "semi di lino", "flax", "sunflower seed", "pumpkin seed"]],
  ["cocco", "Cocco grattugiato", "DISPENSA", 0, 660, 7, 24, 7, 65, 57, 16, ["cocco rap", "cocco grattugiato", "farina di cocco", "coconut flakes", "desiccated coconut"]],
  ["quinoa", "Quinoa", "DISPENSA", 0, 368, 14, 64, 0, 6, 0.7, 7, ["quinoa"]],
  ["couscous", "Couscous e bulgur", "DISPENSA", 0, 376, 12.8, 77, 0, 0.6, 0.1, 5, ["cous", "bulgur"]],
  ["farro", "Farro e orzo", "DISPENSA", 0, 335, 15, 67, 0, 2.5, 0.4, 10.7, ["farro", "orzo perlato", "orzo", "barley", "spelt"]],
  ["gnocchi", "Gnocchi di patate", "FRESCO", 0, 133, 3.3, 30, 0.5, 0.2, 0, 1.8, ["gnocch"]],
  ["polenta", "Farina di mais", "DISPENSA", 0, 362, 8.7, 77, 0.6, 2.7, 0.4, 3.5, ["polenta", "farina di mais", "fioretto", "cornmeal"]],
  ["amido", "Amido / fecola", "DISPENSA", 0, 351, 0.3, 88, 0, 0.1, 0, 0.9, ["fecola", "amido", "maizena", "cornstarch", "starch"]],
  ["sfoglia", "Pasta sfoglia", "FRESCO", 0, 551, 7, 45, 1, 38, 20, 1.5, ["pasta sfoglia", "rotolo di sfoglia", "puff pastry"]],
  ["brisee", "Pasta brisée", "FRESCO", 0, 470, 6, 46, 1, 29, 15, 2, ["brisé", "brisè", "brise", "shortcrust"]],
  ["pasta_uovo", "Pasta fresca all'uovo", "FRESCO", 0, 288, 11, 53, 1, 2.8, 1, 2, ["pasta all'uovo", "pasta fresca", "tagliatelle all'uovo", "sfoglie per lasagne", "lasagne", "fettuccine all'uovo", "pappardelle"]],
  ["ravioli", "Pasta ripiena", "FRESCO", 0, 250, 10, 38, 1.5, 7, 3, 2, ["ravioli", "tortellini", "agnolotti", "cappelletti", "tortelli"]],
  ["biscotti", "Biscotti", "DISPENSA", 10, 450, 7, 70, 25, 15, 5, 3, ["biscott", "cookie", "frollini", "digestive", "oro saiwa", "pavesini"]],
  ["cacao", "Cacao amaro", "DISPENSA", 0, 228, 19.6, 57.9, 1.8, 13.7, 8, 37, ["cacao amaro", "cacao in polvere", "cocoa powder", "cacao"]],
  ["formaggio", "Formaggio semistagionato", "FRESCO", 0, 360, 25, 0.5, 0, 29, 18, 0, ["fontina", "emmental", "provol", "scamorz", "asiago", "taleggio", "groviera", "gruyere", "montasio", "caciocavallo", "formaggio", "cheese"]],
  ["gorgonzola", "Gorgonzola", "FRESCO", 0, 353, 19, 0, 0, 31, 20, 0, ["gorgonzola", "blue cheese", "roquefort"]],
  ["burrata", "Burrata e stracciatella", "FRESCO", 125, 235, 13, 1, 0.5, 20, 14, 0, ["burrata", "stracciatella"]],
  ["robiola", "Robiola e stracchino", "FRESCO", 0, 280, 15, 2, 2, 24, 16, 0, ["robiola", "stracchino", "crescenza", "squacquerone"]],
  ["pesto", "Pesto", "DISPENSA", 0, 470, 5, 6, 1, 47, 7, 2, ["pesto"]],
  ["besciamella", "Besciamella", "FRESCO", 0, 120, 3.6, 8.5, 4, 8, 4.5, 0.2, ["besciamell", "bechamel"]],
  ["marmellata", "Marmellata", "DISPENSA", 0, 250, 0.4, 62, 48, 0.1, 0, 1, ["marmellat", "confettur", "jam"]],
  ["gelatina", "Gelatina / colla di pesce", "DISPENSA", 0, 335, 85, 0, 0, 0, 0, 0, ["colla di pesce", "gelatina", "agar"]],
  ["tahina", "Tahina", "DISPENSA", 0, 595, 17, 21, 0.5, 54, 7.6, 9, ["tahin"]],
  ["hummus", "Hummus", "FRESCO", 0, 166, 8, 14, 0.3, 9.6, 1.4, 6, ["hummus"]],
  ["granola", "Cereali / granola", "DISPENSA", 0, 450, 9, 68, 22, 15, 4, 7, ["granola", "muesli", "cornflakes", "cereali"]],
  ["birra", "Birra", "DISPENSA", 0, 43, 0.5, 3.6, 0, 0, 0, 0, ["birra", "beer"]],
  ["panna_vegetale", "Panna vegetale / da montare", "FRESCO", 0, 250, 1, 10, 9, 23, 20, 0, ["panna vegetale", "panna da montare zuccherata"]],
  ["zucchero_velo", "Zucchero a velo", "DISPENSA", 0, 398, 0, 99.5, 99, 0, 0, 0, ["zucchero a velo", "icing sugar", "powdered sugar"]],
  ["pasta", "Pasta di semola", "DISPENSA", 0.0, 353.0, 11.0, 72.0, 3.0, 1.5, 0.3, 3.0, ["pasta", "spaghetti", "penne", "rigatoni", "fusilli", "linguine", "orecchiette", "paccheri", "ditalini", "tagliatelle", "maccheroni", "farfalle", "bucatini", "mezze maniche", "tortiglioni", "pennette", "conchiglie", "trofie", "fettuccine", "macaroni", "fettuccine pasta"]],
  ["pasta_int", "Pasta integrale", "DISPENSA", 0.0, 340.0, 13.0, 64.0, 3.0, 2.5, 0.5, 8.0, ["pasta integrale", "whole wheat pasta"]],
  ["pasta_legumi", "Pasta di legumi", "DISPENSA", 0.0, 340.0, 23.0, 50.0, 2.0, 2.5, 0.4, 11.0, ["pasta di lenticchie", "pasta di ceci", "legume pasta"]],
  ["riso", "Riso", "DISPENSA", 0.0, 350.0, 7.0, 80.0, 0.2, 0.6, 0.2, 1.0, ["riso", "rice"]],
  ["riso_int", "Riso integrale", "DISPENSA", 0.0, 337.0, 7.5, 72.0, 0.8, 2.2, 0.5, 3.5, ["riso integrale", "brown rice"]],
  ["pane", "Pane", "FORNO", 50.0, 270.0, 9.0, 50.0, 3.0, 3.0, 0.6, 3.0, ["pane", "bread"]],
  ["pane_int", "Pane integrale", "FORNO", 50.0, 240.0, 10.0, 41.0, 4.0, 3.0, 0.6, 7.0, ["pane integrale", "whole wheat bread"]],
  ["tortilla", "Tortilla di frumento", "FORNO", 60.0, 310.0, 8.0, 52.0, 3.0, 8.0, 3.0, 3.5, ["tortilla", "wrap", "piadina"]],
  ["tortilla_int", "Tortilla integrale", "FORNO", 60.0, 280.0, 9.0, 45.0, 2.0, 6.5, 2.0, 7.0, ["tortilla integrale"]],
  ["farina", "Farina 00", "DISPENSA", 0.0, 340.0, 11.0, 72.0, 1.5, 1.0, 0.2, 2.2, ["farina", "flour"]],
  ["avena", "Fiocchi d'avena", "DISPENSA", 0.0, 389.0, 16.9, 66.0, 1.0, 6.9, 1.2, 10.6, ["avena", "oat", "oats"]],
  ["pangrattato", "Pangrattato", "DISPENSA", 0.0, 395.0, 13.0, 72.0, 6.0, 5.0, 1.0, 4.5, ["pangrattato", "breadcrumbs"]],
  ["savoiardi", "Savoiardi", "DISPENSA", 8.0, 391.0, 7.0, 84.0, 50.0, 3.6, 1.0, 1.0, ["savoiardi", "ladyfinger"]],
  ["uova", "Uova", "FRESCO", 50.0, 128.0, 12.4, 0.0, 0.0, 8.7, 3.0, 0.0, ["uovo", "uova", "egg"]],
  ["tuorlo", "Tuorli", "FRESCO", 17.0, 322.0, 16.0, 3.6, 0.6, 26.5, 9.6, 0.0, ["tuorl", "egg yolk"]],
  ["albume", "Albume", "FRESCO", 33.0, 43.0, 10.7, 0.7, 0.7, 0.0, 0.0, 0.0, ["albume", "albumi", "egg white"]],
  ["guanciale", "Guanciale", "CARNE", 0.0, 655.0, 9.0, 0.0, 0.0, 69.0, 25.0, 0.0, ["guanciale", "pork cheek"]],
  ["pancetta", "Pancetta", "CARNE", 0.0, 450.0, 15.0, 0.0, 0.0, 43.0, 16.0, 0.0, ["pancetta", "bacon"]],
  ["prosciutto_cotto", "Prosciutto cotto sgrassato", "CARNE", 0.0, 132.0, 19.8, 0.9, 0.9, 5.0, 1.8, 0.0, ["prosciutto cotto", "ham"]],
  ["pollo", "Petto di pollo", "CARNE", 200, 110.0, 23.0, 0.0, 0.0, 1.2, 0.3, 0.0, ["pollo", "chicken"]],
  ["manzo", "Macinato di manzo", "CARNE", 150, 254.0, 17.0, 0.0, 0.0, 20.0, 8.0, 0.0, ["macinato", "manzo", "ground beef", "beef"]],
  ["manzo_magro", "Macinato magro di manzo", "CARNE", 0.0, 137.0, 21.0, 0.0, 0.0, 5.0, 2.0, 0.0, ["macinato magro", "lean beef"]],
  ["salmone", "Salmone", "CARNE", 150, 208.0, 20.0, 0.0, 0.0, 13.0, 3.1, 0.0, ["salmone", "salmon"]],
  ["tonno", "Tonno al naturale", "DISPENSA", 80, 103.0, 25.0, 0.0, 0.0, 0.3, 0.1, 0.0, ["tonno", "tuna"]],
  ["tofu", "Tofu", "FRESCO", 200, 76.0, 8.0, 1.9, 0.6, 4.8, 0.7, 0.3, ["tofu"]],
  ["ceci", "Ceci lessati", "DISPENSA", 0.0, 164.0, 8.9, 27.0, 4.8, 2.6, 0.3, 7.6, ["ceci", "chickpea"]],
  ["lenticchie", "Lenticchie lessate", "DISPENSA", 0.0, 116.0, 9.0, 20.0, 1.8, 0.4, 0.1, 7.9, ["lenticchie", "lentil"]],
  ["edamame", "Edamame", "FRESCO", 0.0, 121.0, 11.9, 8.9, 2.2, 5.2, 0.6, 5.2, ["edamame"]],
  ["pecorino", "Pecorino romano", "FRESCO", 0.0, 390.0, 26.0, 0.2, 0.2, 31.0, 18.0, 0.0, ["pecorino"]],
  ["parmigiano", "Parmigiano Reggiano", "FRESCO", 0.0, 392.0, 33.0, 0.0, 0.0, 28.0, 18.0, 0.0, ["parmigiano", "grana", "parmesan"]],
  ["mozzarella", "Mozzarella", "FRESCO", 125.0, 253.0, 18.7, 0.7, 0.7, 19.5, 12.0, 0.0, ["mozzarella"]],
  ["mozzarella_light", "Mozzarella light", "FRESCO", 125.0, 160.0, 20.0, 1.0, 1.0, 8.5, 5.0, 0.0, ["mozzarella light"]],
  ["feta", "Feta", "FRESCO", 200.0, 264.0, 14.0, 4.0, 4.0, 21.0, 15.0, 0.0, ["feta"]],
  ["feta_light", "Feta light", "FRESCO", 200.0, 180.0, 18.0, 4.0, 4.0, 10.0, 7.0, 0.0, ["feta light"]],
  ["cheddar", "Cheddar", "FRESCO", 20.0, 403.0, 25.0, 1.3, 0.5, 33.0, 21.0, 0.0, ["cheddar", "cheese slice"]],
  ["fiocchi_latte", "Fiocchi di latte", "FRESCO", 0.0, 98.0, 11.0, 3.4, 2.7, 4.3, 2.7, 0.0, ["fiocchi di latte", "cottage cheese"]],
  ["ricotta", "Ricotta vaccina", "FRESCO", 0.0, 146.0, 8.8, 3.5, 3.5, 10.9, 7.0, 0.0, ["ricotta"]],
  ["mascarpone", "Mascarpone", "FRESCO", 0.0, 455.0, 7.6, 0.3, 0.3, 47.0, 30.0, 0.0, ["mascarpone"]],
  ["panna", "Panna da cucina", "FRESCO", 0.0, 337.0, 2.3, 3.4, 3.4, 35.0, 22.0, 0.0, ["panna", "cream", "heavy cream"]],
  ["yogurt_greco", "Yogurt greco 0%", "FRESCO", 170.0, 57.0, 10.0, 3.5, 3.5, 0.4, 0.1, 0.0, ["yogurt greco", "greek yogurt", "yogurt"]],
  ["latte", "Latte intero", "FRESCO", 0.0, 64.0, 3.3, 4.9, 4.9, 3.6, 2.1, 0.0, ["latte", "milk"]],
  ["latte_ps", "Latte parz. scremato", "FRESCO", 0.0, 46.0, 3.5, 5.0, 5.0, 1.5, 1.0, 0.0, ["latte scremato", "skim milk"]],
  ["burro", "Burro", "FRESCO", 0.0, 758.0, 0.8, 1.1, 1.1, 83.0, 52.0, 0.0, ["burro", "butter"]],
  ["maionese", "Maionese", "SPEZIE", 0.0, 680.0, 1.0, 0.6, 0.6, 75.0, 11.0, 0.0, ["maionese", "mayo", "mayonnaise"]],
  ["olio", "Olio extravergine", "SPEZIE", 0.0, 899.0, 0.0, 0.0, 0.0, 99.9, 15.0, 0.0, ["olio", "oil", "olive oil"]],
  ["zucchero", "Zucchero", "DISPENSA", 0.0, 392.0, 0.0, 100.0, 100.0, 0.0, 0.0, 0.0, ["zucchero", "sugar"]],
  ["miele", "Miele", "DISPENSA", 0.0, 304.0, 0.3, 82.0, 82.0, 0.0, 0.0, 0.2, ["miele", "honey", "sciroppo d'acero", "maple syrup"]],
  ["cioccolato", "Cioccolato fondente", "DISPENSA", 0.0, 515.0, 6.6, 49.7, 47.0, 33.6, 20.0, 8.0, ["cioccolato", "chocolate", "cacao"]],
  ["burro_arachidi", "Burro di arachidi", "DISPENSA", 0.0, 588.0, 25.0, 20.0, 9.0, 50.0, 10.0, 6.0, ["burro di arachidi", "peanut butter"]],
  ["caffe", "Caffè espresso", "DISPENSA", 0.0, 2.0, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, ["caffè", "caffe", "coffee", "espresso"]],
  ["pomodoro", "Pomodori", "ORTO", 100.0, 19.0, 1.0, 3.5, 3.5, 0.2, 0.0, 1.2, ["pomodor", "tomato"]],
  ["passata", "Passata di pomodoro", "DISPENSA", 0.0, 24.0, 1.3, 4.0, 4.0, 0.2, 0.0, 1.5, ["passata", "pelati", "tomato sauce", "crushed tomato"]],
  ["pomodori_secchi", "Pomodori secchi sott'olio", "DISPENSA", 0.0, 213.0, 5.0, 23.0, 15.0, 14.0, 2.0, 6.0, ["pomodori secchi", "sun-dried tomato"]],
  ["cipolla", "Cipolla", "ORTO", 100.0, 26.0, 1.0, 5.7, 5.7, 0.1, 0.0, 1.1, ["cipoll", "scalogno", "onion", "shallot"]],
  ["cipollotto", "Cipollotto", "ORTO", 15.0, 27.0, 1.8, 5.0, 2.3, 0.2, 0.0, 2.6, ["cipollott", "green onion", "scallion"]],
  ["aglio", "Aglio", "ORTO", 4.0, 45.0, 0.9, 8.4, 8.4, 0.6, 0.1, 2.3, ["aglio", "garlic"]],
  ["zucchine", "Zucchine", "ORTO", 200.0, 11.0, 1.3, 1.4, 1.4, 0.1, 0.0, 1.2, ["zucchin", "zucchini", "courgette"]],
  ["spinaci", "Spinaci", "ORTO", 0.0, 23.0, 2.9, 3.6, 0.4, 0.4, 0.1, 2.2, ["spinac", "spinach"]],
  ["melanzane", "Melanzane", "ORTO", 300.0, 18.0, 1.1, 2.6, 2.6, 0.1, 0.0, 2.6, ["melanzan", "eggplant", "aubergine"]],
  ["peperoni", "Peperoni", "ORTO", 200.0, 26.0, 0.9, 4.2, 4.2, 0.3, 0.0, 1.9, ["peperon", "bell pepper", "pepper red"]],
  ["funghi", "Funghi champignon", "ORTO", 20, 22.0, 3.1, 3.3, 2.0, 0.3, 0.0, 1.0, ["funghi", "mushroom"]],
  ["carote", "Carote", "ORTO", 80.0, 35.0, 1.1, 7.6, 7.6, 0.2, 0.0, 3.1, ["carot", "carrot"]],
  ["broccoli", "Broccoli", "ORTO", 350, 34.0, 2.8, 7.0, 1.7, 0.4, 0.0, 2.6, ["broccol", "broccoli"]],
  ["insalata", "Insalata / rucola", "ORTO", 0.0, 25.0, 2.6, 3.7, 2.0, 0.7, 0.0, 1.6, ["insalata", "rucola", "lattuga", "lettuce", "arugula"]],
  ["cetriolo", "Cetriolo", "ORTO", 250.0, 15.0, 0.7, 3.6, 1.7, 0.1, 0.0, 0.5, ["cetriol", "cucumber"]],
  ["avocado", "Avocado", "ORTO", 150.0, 160.0, 2.0, 8.5, 0.7, 14.7, 2.1, 6.7, ["avocado"]],
  ["limone", "Limone", "ORTO", 100.0, 29.0, 1.1, 9.0, 2.5, 0.3, 0.0, 2.8, ["limone", "lemon", "lime"]],
  ["banana", "Banana", "ORTO", 120.0, 89.0, 1.1, 23.0, 12.0, 0.3, 0.1, 2.6, ["banana"]],
  ["frutti_bosco", "Frutti di bosco", "ORTO", 0.0, 45.0, 1.0, 10.0, 7.0, 0.4, 0.0, 5.0, ["frutti di bosco", "mirtill", "lampon", "berries", "blueberr"]],
  ["erbe", "Erbe aromatiche", "ORTO", 0.0, 25.0, 3.0, 3.0, 0.3, 0.6, 0.0, 2.0, ["basilico", "prezzemolo", "menta", "coriandolo", "rosmarino", "origano", "basil", "parsley", "cilantro"]],
  ["salsa_soia", "Salsa di soia", "SPEZIE", 0.0, 53.0, 8.0, 4.9, 0.4, 0.6, 0.1, 0.8, ["salsa di soia", "soy sauce", "tamari"]],
  ["aceto", "Aceto di riso / mele", "SPEZIE", 0.0, 18.0, 0.0, 0.9, 0.0, 0.0, 0.0, 0.0, ["aceto", "vinegar"]],
  ["sriracha", "Salsa piccante", "SPEZIE", 0.0, 93.0, 1.9, 19.0, 9.0, 0.9, 0.1, 2.2, ["sriracha", "salsa piccante", "hot sauce", "chili", "peperoncino"]],
  ["sesamo", "Semi di sesamo", "DISPENSA", 0.0, 573.0, 17.7, 23.0, 0.3, 49.7, 7.0, 11.8, ["sesamo", "sesame"]],
  ["olio_sesamo", "Olio di sesamo", "SPEZIE", 0.0, 884.0, 0.0, 0.0, 0.0, 100.0, 14.0, 0.0, ["olio di sesamo", "sesame oil"]],
  ["alga_nori", "Alga nori", "DISPENSA", 3.0, 35.0, 5.8, 5.1, 0.5, 0.3, 0.1, 0.3, ["nori", "seaweed"]],
  ["sale", "Sale e pepe", "SPEZIE", 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, ["sale", "pepe", "salt", "pepper", "paprika", "cumino", "spezie", "curry", "curcuma", "zenzero in polvere", "cannella", "vaniglia", "garam masala", "turmeric", "cinnamon", "vanilla"]],
  ["lievito", "Lievito per dolci", "DISPENSA", 0.0, 80.0, 0.0, 20.0, 0.0, 0.0, 0.0, 0.0, ["lievito", "baking powder", "bicarbonato"]],
  ["lievito_birra", "Lievito di birra", "FRESCO", 0.0, 105.0, 8.4, 4.0, 0.0, 1.9, 0.3, 6.0, ["lievito di birra", "yeast", "lievito secco"]],
  ["sedano", "Sedano", "ORTO", 40.0, 16.0, 0.7, 3.0, 1.8, 0.2, 0.0, 1.6, ["sedano", "celery"]],
  ["vino", "Vino", "DISPENSA", 0.0, 83.0, 0.1, 2.6, 0.6, 0.0, 0.0, 0.0, ["vino", "wine"]],
  ["noce_moscata", "Noce moscata", "SPEZIE", 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, ["noce moscata", "nutmeg"]],
  ["farina_int", "Farina integrale", "DISPENSA", 0.0, 319.0, 12.0, 61.0, 2.1, 1.9, 0.3, 10.0, ["farina integrale", "whole wheat flour"]],
  ["olio_semi", "Olio di semi di girasole", "SPEZIE", 0.0, 884.0, 0.0, 0.0, 0.0, 100.0, 11.0, 0.0, ["olio di semi", "olio di girasole", "vegetable oil", "canola oil", "sunflower oil"]],
  ["eritritolo", "Eritritolo", "DISPENSA", 0.0, 20.0, 0.0, 5.0, 0.0, 0.0, 0.0, 0.0, ["eritritolo", "erythritol", "dolcificante"]],
  ["spalmabile", "Formaggio spalmabile", "FRESCO", 0.0, 253.0, 5.9, 4.0, 3.0, 24.0, 15.0, 0.0, ["formaggio spalmabile", "philadelphia", "cream cheese", "formaggio fresco"]],
  ["spalmabile_light", "Formaggio spalmabile light", "FRESCO", 0.0, 150.0, 7.5, 5.0, 4.0, 11.0, 7.0, 0.0, ["spalmabile light", "light cream cheese"]],
  ["panna_acida", "Panna acida", "FRESCO", 0.0, 198.0, 2.4, 4.6, 3.5, 19.0, 12.0, 0.0, ["panna acida", "sour cream"]],
  ["salsiccia", "Salsiccia", "CARNE", 100, 304.0, 15.0, 1.0, 0.0, 27.0, 10.0, 0.0, ["salsiccia", "salsicce", "sausage"]],
  ["salsiccia_pollo", "Salsiccia di pollo", "CARNE", 80, 160.0, 16.0, 2.0, 1.0, 10.0, 3.0, 0.0, ["salsiccia di pollo", "chicken sausage"]],
  ["latte_cocco", "Latte di cocco", "DISPENSA", 0.0, 197.0, 2.0, 3.0, 2.0, 21.0, 18.6, 0.0, ["latte di cocco", "coconut milk", "crema di cocco"]],
  ["latte_cocco_light", "Latte di cocco light", "DISPENSA", 0.0, 70.0, 0.7, 2.0, 1.0, 7.0, 6.0, 0.0, ["latte di cocco light", "light coconut milk"]],
  ["cioccolato_latte", "Cioccolato al latte", "DISPENSA", 0.0, 535.0, 7.6, 59.0, 56.0, 30.0, 18.0, 2.0, ["cioccolato al latte", "milk chocolate", "chocolate chips", "gocce di cioccolato"]],
  ["crema_nocciole", "Crema spalmabile alle nocciole", "DISPENSA", 0.0, 539.0, 6.3, 57.5, 56.0, 31.0, 10.6, 3.4, ["crema spalmabile", "nutella", "hazelnut spread", "crema di nocciole"]],
  ["ketchup", "Ketchup / salsa barbecue", "SPEZIE", 0.0, 112.0, 1.2, 26.0, 22.0, 0.1, 0.0, 0.3, ["ketchup", "barbecue", "bbq sauce"]],
  ["patate", "Patate", "ORTO", 150.0, 77.0, 2.0, 17.0, 0.8, 0.1, 0.0, 2.2, ["patat", "potato"]],
  ["zucchero_canna", "Zucchero di canna", "DISPENSA", 0.0, 380.0, 0.0, 98.0, 97.0, 0.0, 0.0, 0.0, ["zucchero di canna", "brown sugar"]],
  ["acqua", "Acqua / brodo", "DISPENSA", 0.0, 5.0, 0.5, 0.5, 0.2, 0.1, 0.0, 0.0, ["acqua", "brodo", "water", "broth", "stock"]],
];
const LIGHT_RULES = [
  {"id": "sour", "ctx": "ANY", "kw": ["panna acida", "sour cream", "crème fraîche", "creme fraiche"], "ex": [], "keep": 0.0, "add": "yogurt_greco", "ratio": 1.0, "addName": null, "min": 20.0, "title": "Panna acida → yogurt greco 0%", "why": "Stessa acidità e cremosità, con circa il 70% di calorie in meno e molte più proteine."},
  {"id": "creamcheese", "ctx": "ANY", "kw": ["formaggio spalmabile", "philadelphia", "cream cheese", "formaggio fresco spalmabile"], "ex": ["light"], "keep": 0.0, "add": "spalmabile_light", "ratio": 1.0, "addName": null, "min": 30.0, "title": "Formaggio spalmabile → versione light", "why": "Nelle creme e nelle cheesecake il risultato è quasi identico, con circa metà dei grassi."},
  {"id": "cream-sweet", "ctx": "SWEET", "kw": ["panna", "cream", "whipping"], "ex": ["ice cream", "gelato", "cocco", "coconut", "cream cheese", "tartar"], "keep": 0.5, "add": "yogurt_greco", "ratio": 0.5, "addName": null, "min": 30.0, "title": "Panna → metà panna, metà yogurt greco", "why": "Monta la panna e poi incorpora lo yogurt greco: resta soffice e ha circa metà delle calorie."},
  {"id": "cream", "ctx": "SAVORY", "kw": ["panna", "cream"], "ex": ["cream cheese", "ice cream", "gelato", "cocco", "coconut", "tartar"], "keep": 0.0, "add": "yogurt_greco", "ratio": 1.0, "addName": null, "min": 20.0, "title": "Panna → yogurt greco 0%", "why": "Stessa cremosità con circa l'85% di calorie in meno e il triplo delle proteine. Aggiungilo a fuoco spento, così non si separa."},
  {"id": "mayo", "ctx": "ANY", "kw": ["maionese", "mayo", "mayonnaise"], "ex": [], "keep": 0.3, "add": "yogurt_greco", "ratio": 0.7, "addName": null, "min": 10.0, "title": "Maionese → salsa allo yogurt (70%)", "why": "Tieni un cucchiaio di maionese per il gusto e completa con yogurt greco e un po' di senape o limone."},
  {"id": "mascarpone", "ctx": "ANY", "kw": ["mascarpone"], "ex": [], "keep": 0.5, "add": "ricotta", "ratio": 0.5, "addName": "Ricotta", "min": 50.0, "title": "Mascarpone → metà ricotta", "why": "La ricotta setacciata rende la crema vellutata con meno della metà dei grassi saturi."},
  {"id": "coconut", "ctx": "ANY", "kw": ["latte di cocco", "coconut milk", "crema di cocco", "coconut cream"], "ex": ["light"], "keep": 0.0, "add": "latte_cocco_light", "ratio": 1.0, "addName": null, "min": 50.0, "title": "Latte di cocco → versione light", "why": "Il profumo resta lo stesso, con circa un terzo delle calorie."},
  {"id": "butter-sweet", "ctx": "SWEET", "kw": ["burro", "butter"], "ex": ["arachidi", "peanut", "cacao", "cocoa"], "keep": 0.5, "add": "yogurt_greco", "ratio": 0.6, "addName": null, "min": 30.0, "title": "Burro → metà burro + yogurt greco", "why": "Nei dolci lo yogurt mantiene l'umidità: metà del burro basta per il sapore. Nella frolla usa invece 80 g di olio di semi ogni 100 g di burro."},
  {"id": "butter", "ctx": "SAVORY", "kw": ["burro", "butter"], "ex": ["arachidi", "peanut"], "keep": 0.0, "add": "olio", "ratio": 0.5, "addName": null, "min": 8.0, "title": "Burro → metà dose di olio EVO", "why": "Per rosolare basta metà quantità di olio, e i grassi diventano insaturi."},
  {"id": "oil", "ctx": "ANY", "kw": ["olio", "oil"], "ex": ["sesamo", "sesame", "cocco", "coconut"], "keep": 0.5, "add": null, "ratio": 0.0, "addName": null, "min": 15.0, "title": "Olio dimezzato", "why": "Usa una padella antiaderente, un nebulizzatore o un pennello. Per friggere, la friggitrice ad aria fa un ottimo lavoro."},
  {"id": "milk", "ctx": "ANY", "kw": ["latte", "milk"], "ex": ["scremato", "skim", "fiocchi", "cocco", "coconut", "condensato", "condensed", "cioccolato", "chocolate", "almond", "mandorla", "avena", "oat", "soy", "soia"], "keep": 0.0, "add": "latte_ps", "ratio": 1.0, "addName": null, "min": 50.0, "title": "Latte intero → parz. scremato", "why": "Il risultato è praticamente identico."},
  {"id": "mozzarella", "ctx": "ANY", "kw": ["mozzarella"], "ex": ["light"], "keep": 0.0, "add": "mozzarella_light", "ratio": 1.0, "addName": null, "min": 40.0, "title": "Mozzarella → mozzarella light", "why": "Fila allo stesso modo e ha più o meno la metà dei grassi."},
  {"id": "feta", "ctx": "ANY", "kw": ["feta"], "ex": ["light"], "keep": 0.0, "add": "feta_light", "ratio": 1.0, "addName": null, "min": 40.0, "title": "Feta → feta light", "why": "Il gusto sapido rimane e i grassi si dimezzano."},
  {"id": "aged", "ctx": "ANY", "kw": ["parmigiano", "pecorino", "grana", "cheddar", "parmesan", "provolone", "gruyere", "gruyère", "emmental", "fontina", "gorgonzola", "cheese"], "ex": ["cream cheese", "cottage", "light"], "keep": 0.7, "add": null, "ratio": 0.0, "addName": null, "min": 20.0, "title": "Formaggi stagionati −30%", "why": "Grattugiali finissimi e aggiungili alla fine: ne serve meno per sentire lo stesso sapore."},
  {"id": "bacon", "ctx": "ANY", "kw": ["guanciale", "pancetta", "bacon", "lardo", "speck"], "ex": [], "keep": 0.6, "add": null, "ratio": 0.0, "addName": null, "min": 30.0, "title": "Guanciale/pancetta −40%", "why": "Rosolali finché sono ben croccanti e scarta il grasso fuso in eccesso: il sapore resta, le calorie calano molto."},
  {"id": "sausage", "ctx": "ANY", "kw": ["salsiccia", "salsicce", "sausage", "chorizo", "wurstel"], "ex": ["pollo", "chicken", "tacchino", "turkey"], "keep": 0.0, "add": "salsiccia_pollo", "ratio": 1.0, "addName": null, "min": 50.0, "title": "Salsiccia → salsiccia di pollo o tacchino", "why": "Stesso uso in cucina, meno della metà dei grassi saturi."},
  {"id": "beef", "ctx": "ANY", "kw": ["macinato", "ground beef", "minced beef", "manzo"], "ex": ["magro", "lean", "brodo", "broth", "stock"], "keep": 0.0, "add": "manzo_magro", "ratio": 1.0, "addName": null, "min": 50.0, "title": "Macinato → macinato magro 5%", "why": "Più proteine e meno della metà dei grassi saturi. Schiaccialo comunque in padella bollente per la crosticina."},
  {"id": "milkchoc", "ctx": "ANY", "kw": ["cioccolato al latte", "milk chocolate", "chocolate chips", "gocce di cioccolato", "cioccolato bianco", "white chocolate"], "ex": [], "keep": 0.0, "add": "cioccolato", "ratio": 0.8, "addName": "Cioccolato fondente 70%", "min": 20.0, "title": "Cioccolato al latte → fondente 70% (−20%)", "why": "Il fondente ha un gusto più intenso: ne basta meno, con meno zuccheri e più fibre."},
  {"id": "spread", "ctx": "ANY", "kw": ["crema spalmabile", "nutella", "hazelnut spread", "crema di nocciole"], "ex": [], "keep": 0.6, "add": null, "ratio": 0.0, "addName": null, "min": 20.0, "title": "Crema alle nocciole −40%", "why": "Scaldala qualche secondo: diventa più fluida e se ne usa meno per coprire la stessa superficie."},
  {"id": "sugar", "ctx": "ANY", "kw": ["zucchero", "sugar"], "ex": ["a velo", "powdered", "icing", "vanigliato"], "keep": 0.6, "add": "eritritolo", "ratio": 0.5, "addName": "Eritritolo (dolcificante naturale)", "min": 15.0, "title": "Zucchero → 40% eritritolo", "why": "Sostituisci il 40% dello zucchero con eritritolo: dolcifica in modo simile, non ha quasi calorie e non alza la glicemia. Se preferisci evitarlo, riduci solo lo zucchero del 30%."},
  {"id": "icing", "ctx": "ANY", "kw": ["zucchero a velo", "powdered sugar", "icing sugar"], "ex": [], "keep": 0.7, "add": null, "ratio": 0.0, "addName": null, "min": 15.0, "title": "Zucchero a velo −30%", "why": "Nelle creme e nella frolla la differenza si sente pochissimo: aggiungi vaniglia o scorza di limone."},
  {"id": "syrup", "ctx": "ANY", "kw": ["miele", "honey", "sciroppo", "syrup", "agave"], "ex": [], "keep": 0.7, "add": null, "ratio": 0.0, "addName": null, "min": 10.0, "title": "Miele/sciroppi −30%", "why": "Bastano un po' di cannella o vaniglia per non sentire la differenza."},
  {"id": "eggs", "ctx": "ANY", "kw": ["uova", "uovo", "eggs", "egg"], "ex": ["album", "white", "tuorl", "yolk", "noodle", "eggplant", "melanzan"], "keep": 0.67, "add": "albume", "ratio": 0.44, "addName": "Albumi", "min": 150.0, "title": "1 uovo su 3 → 2 albumi", "why": "Ogni uovo intero sostituito da due albumi toglie grassi e colesterolo e mantiene la struttura: funziona bene in torte, frittate e pan di Spagna."},
  {"id": "flour", "ctx": "ANY", "kw": ["farina", "flour"], "ex": ["integrale", "whole", "mais", "corn", "riso", "rice", "mandorl", "almond", "cocco", "coconut", "ceci", "chickpea"], "keep": 0.7, "add": "farina_int", "ratio": 0.3, "addName": null, "min": 100.0, "title": "Farina → 30% integrale", "why": "Più fibre e più sazietà, con un gusto più rustico. Con il 30% l'impasto resta lavorabile e lievita bene; aggiungi un cucchiaio d'acqua in più."},
  {"id": "pasta", "ctx": "SAVORY", "kw": ["pasta", "spaghetti", "penne", "fusilli", "rigatoni", "ditalini", "linguine", "tagliatelle", "maccheroni", "macaroni", "noodle"], "ex": ["integrale", "whole", "legumi", "ceci", "lenticchie", "frolla", "sfoglia", "pasta di", "paste"], "keep": 0.0, "add": "pasta_int", "ratio": 0.85, "addName": null, "min": 100.0, "title": "Pasta → integrale (porzione −15%)", "why": "Fibre più che raddoppiate e sazietà maggiore: la porzione un po' più piccola non si sente."},
  {"id": "rice", "ctx": "SAVORY", "kw": ["riso", "rice"], "ex": ["integrale", "brown", "farina", "flour", "aceto", "vinegar"], "keep": 0.0, "add": "riso_int", "ratio": 0.9, "addName": null, "min": 80.0, "title": "Riso → riso integrale", "why": "Più fibre e un indice glicemico più basso. Allunga la cottura di 10-15 minuti."},
  {"id": "tortilla", "ctx": "ANY", "kw": ["tortilla", "wrap", "piadina"], "ex": ["integrale", "whole"], "keep": 0.0, "add": "tortilla_int", "ratio": 1.0, "addName": null, "min": 40.0, "title": "Tortilla → integrale", "why": "Raddoppi le fibre, con un sapore più rustico."},
  {"id": "bread", "ctx": "ANY", "kw": ["pane", "bread", "bun"], "ex": ["integrale", "whole", "pangrattato", "breadcrumb"], "keep": 0.0, "add": "pane_int", "ratio": 1.0, "addName": null, "min": 40.0, "title": "Pane → pane integrale", "why": "Più fibre e più sazietà."},
  {"id": "crumbs", "ctx": "ANY", "kw": ["pangrattato", "breadcrumb", "panko"], "ex": [], "keep": 0.6, "add": null, "ratio": 0.0, "addName": null, "min": 30.0, "title": "Pangrattato −40%", "why": "Panatura in un solo strato e cottura al forno o in friggitrice ad aria: croccante con molto meno olio assorbito."},
  {"id": "ketchup", "ctx": "ANY", "kw": ["ketchup", "barbecue", "bbq"], "ex": [], "keep": 0.5, "add": null, "ratio": 0.0, "addName": null, "min": 10.0, "title": "Ketchup/barbecue −50%", "why": "Completa con passata di pomodoro e paprika affumicata: stesso gusto, metà degli zuccheri."},
  {"id": "sundried", "ctx": "ANY", "kw": ["pomodori secchi", "sun-dried", "sundried"], "ex": [], "keep": 0.7, "add": null, "ratio": 0.0, "addName": null, "min": 30.0, "title": "Pomodori secchi scolati −30%", "why": "Scolali bene dall'olio e tamponali."},
];

const N = (kcal = 0, prot = 0, carb = 0, sug = 0, fat = 0, sat = 0, fib = 0) => ({ kcal, prot, carb, sug, fat, sat, fib });
const scaleN = (n, f) => N(n.kcal * f, n.prot * f, n.carb * f, n.sug * f, n.fat * f, n.sat * f, n.fib * f);
const addN = (a, b) => { for (const k in b) a[k] = (a[k] || 0) + b[k]; return a; };

const FOODS = {};
for (const [key, name, aisle, gPerPz, kcal, prot, carb, sug, fat, sat, fib, keywords] of FOOD_DATA)
  FOODS[key] = { key, name, aisle: AISLE[aisle] || aisle, gPerPz, per100: N(kcal, prot, carb, sug, fat, sat, fib), keywords };

const CUSTOM = {}; // alimenti aggiunti dall'utente o trovati sul web: chiave = nome normalizzato
const normName = s => (s || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-zàèéìòù' ]/g, ' ').replace(/\s+/g, ' ').trim();
function setCustomFoods(map) {
  for (const k of Object.keys(CUSTOM)) delete CUSTOM[k];
  for (const [k, f] of Object.entries(map || {})) CUSTOM[k] = { key: 'c:' + k, name: f.name, aisle: f.aisle || 'Altro', gPerPz: f.gPerPz || 0, per100: Object.assign(N(), f.per100), keywords: [k], custom: true, source: f.source };
}
function matchFood(name) {
  const n = (name || '').toLowerCase(), nn = normName(name);
  let best = null, bestLen = 0;
  for (const f of Object.values(CUSTOM)) { const k = f.keywords[0]; if (k.length >= 3 && (' ' + nn + ' ').includes(' ' + k) && k.length > bestLen) { best = f; bestLen = k.length; } }
  if (best && (best.keywords[0] === nn || bestLen >= 6)) return best;
  for (const f of Object.values(FOODS)) for (const k of f.keywords) if (n.includes(k) && k.length > bestLen) { best = f; bestLen = k.length; }
  return best;
}
const aisleOf = name => { const f = matchFood(name); return f ? f.aisle : 'Altro'; };

function toGrams(f, amount, unit) {
  const u = (unit || '').toLowerCase().trim();
  if (['g', 'ml', 'gr'].includes(u)) return amount;
  if (u === 'kg' || u === 'l') return amount * 1000;
  if (u === 'cl') return amount * 10;
  if (['pz', 'pezzi', 'pezzo', 'spicchio', 'spicchi', 'fetta', 'fette'].includes(u)) return amount * (f && f.gPerPz > 0 ? f.gPerPz : 50);
  if (u.startsWith('cucchiaio') || u === 'cucchiai') return amount * 10;
  if (u.startsWith('cucchiain')) return amount * 4;
  if (u.startsWith('tazzin')) return amount * 40;
  if (u.startsWith('bicchier')) return amount * 200;
  if (u === 'q.b.' || u === 'qb') return 0;
  return amount;
}

/** Ingrediente da nome e quantità: valori dalla tabella se l'alimento è riconosciuto. */
function ingredient(name, amount, unit, grams, english) {
  let f = matchFood(name);
  if (!f && english) f = matchFood(english);
  if (!(grams > 0)) grams = toGrams(f, amount, unit);
  return { name, amount: amount || 0, unit: unit || '', grams, aisle: f ? f.aisle : 'Altro', n: f ? scaleN(f.per100, grams / 100) : N(), note: '' };
}

function ing(key, displayName, amount, unit) {
  const f = FOODS[key];
  const grams = toGrams(f, amount, unit);
  return { name: displayName || f.name, amount, unit, grams, aisle: f.aisle, n: scaleN(f.per100, grams / 100), note: '' };
}

// ===================== RICETTE =====================
const copy = o => JSON.parse(JSON.stringify(o));

function normRecipe(r) {
  const d = { id: 'r-' + Math.random().toString(36).slice(2), title: 'Ricetta', description: '', source: 'RecipeFlow', sourceUrl: '', imageUrl: '', minutes: 0, servings: 2,
    popularity: 0, difficulty: 'Facile', tags: [], ingredients: [], steps: [], light: false, lang: 'it', kind: '', sources: [], notes: '' };
  const out = Object.assign(d, r || {});
  out.servings = Math.max(1, Math.round(out.servings || 2));
  out.ingredients = (out.ingredients || []).map(i => Object.assign({ name: '', amount: 0, unit: '', grams: 0, aisle: 'Altro', n: N(), note: '' }, i, { n: Object.assign(N(), i.n || {}) }));
  return out;
}

// alimenti senza calorie per natura (non vanno segnalati come sconosciuti)
const ZERO_OK = /\b(acqua|water|ghiaccio|ice|sale\b|salt|pepe\b|pepper|bicarbonat|lievito chimico|caffè|caffe|tè\b|the\b|tea\b|brodo|stock|spezie|erbe|aroma|vanigli|cannella|curry|paprika|cumino|curcuma|noce moscata|chiodi di garofano|alloro|timo|salvia|rosmarino|origano|peperoncino)\b/i;
const PIECE_UNITS = ['pz', 'pezzi', 'pezzo', 'spicchio', 'spicchi', 'fetta', 'fette'];
const isFryingOil = (i, f) => f && (f.key === 'olio' || f.key === 'olio_semi') && (/frigg|frittura|\bfry|per friggere/i.test(i.name + ' ' + (i.note || '')) || i.grams >= 300);

/** Valori effettivi di un ingrediente: completa quelli mancanti con la tabella (anche gli alimenti salvati) e conta solo l'olio assorbito in frittura. */
function effN(i) {
  if (!(i.grams > 0)) return i.n || N();
  const f = matchFood(i.name);
  let grams = i.grams;
  if (f && PIECE_UNITS.includes((i.unit || '').toLowerCase()) && f.gPerPz > 0 && Math.abs(grams - i.amount * 50) < 0.01) grams = i.amount * f.gPerPz;
  let n = i.n && i.n.kcal > 0 && grams === i.grams ? i.n : (f ? scaleN(f.per100, grams / 100) : (i.n || N()));
  if (isFryingOil(i, f)) n = scaleN(f.per100, grams * 0.12 / 100);
  return n;
}
/** Ingredienti di cui non conosco i valori (contati come 0 kcal). */
function unknownIngredients(r) {
  const out = [];
  for (const i of r.ingredients) {
    if (i.unit === 'q.b.' || !(i.grams > 0) || i.grams < 3 || ZERO_OK.test(i.name)) continue;
    if (effN(i).kcal >= 1) continue;
    if (!out.some(x => normName(x) === normName(i.name))) out.push(i.name);
  }
  return out;
}
const total = r => r.ingredients.reduce((a, i) => addN(a, effN(i)), N());
const perServing = r => scaleN(total(r), 1 / Math.max(1, r.servings));
const hasTag = (r, t) => r.tags.some(x => x.toLowerCase() === t.toLowerCase());

function fmtNum(a) {
  if (Math.abs(a - Math.round(a)) < 0.05) return String(Math.round(a));
  if (a < 10) return a.toFixed(1).replace('.', ',');
  return String(Math.round(a));
}

function quantityLabel(i, factor = 1) {
  const a = i.amount * factor;
  let u = i.unit || '';
  if (a <= 0) return u;
  const num = fmtNum(a);
  const sing = { cucchiai: 'cucchiaio', cucchiaini: 'cucchiaino', spicchi: 'spicchio', fette: 'fetta' };
  const plur = { cucchiaio: 'cucchiai', cucchiaino: 'cucchiaini', spicchio: 'spicchi', fetta: 'fette' };
  if (num === '1') u = sing[u] || u; else if (!num.startsWith('0')) u = plur[u] || u;
  return (num + ' ' + u).trim();
}

// ===================== VERSIONE LEGGERA =====================
function ruleMatches(r, name) {
  const n = name.toLowerCase();
  if (r.ex.some(e => n.includes(e))) return false;
  return r.kw.some(k => n.includes(k));
}

function isSweet(r) {
  if (hasTag(r, 'Dolce') || hasTag(r, 'Colazione') || hasTag(r, 'Dessert')) return true;
  let sugar = 0;
  for (const i of r.ingredients) { const n = i.name.toLowerCase(); if (/zucchero|sugar|miele|honey/.test(n)) sugar += i.grams; }
  return sugar >= 40;
}

const hasFish = r => r.ingredients.some(i => /salmon|tonno|pesce|tuna|fish/.test(i.name.toLowerCase())) || r.tags.includes('Pesce');

function lighten(src, disabled = new Set()) {
  const res = { original: src, light: null, changes: [], tips: [], additions: [] };
  const l = copy(src);
  l.light = true; l.id = src.id + '-light'; l.title = src.title + ' · versione leggera'; l.ingredients = [];
  const serv = Math.max(1, src.servings);
  const sweet = isSweet(src), ctx = sweet ? 'SWEET' : 'SAVORY';
  const delta = {}, used = {};
  for (const ing0 of src.ingredients) {
    const rule = LIGHT_RULES.find(r => (r.ctx === 'ANY' || r.ctx === ctx) && ruleMatches(r, ing0.name) && ing0.grams >= r.min);
    if (!rule || ing0.grams <= 0) { l.ingredients.push(copy(ing0)); continue; }
    const before = ing0.n.kcal; let after = 0;
    const repl = [];
    if (rule.keep > 0) {
      const kept = copy(ing0);
      kept.amount *= rule.keep; kept.grams *= rule.keep; kept.n = scaleN(ing0.n, rule.keep);
      kept.note = rule.add == null ? 'dose ridotta del ' + Math.round((1 - rule.keep) * 100) + '%' : 'dose ridotta';
      repl.push(kept); after += kept.n.kcal;
    }
    if (rule.add != null) {
      const f = FOODS[rule.add], g = ing0.grams * rule.ratio;
      const a = { name: rule.addName || f.name, amount: Math.round(g), unit: 'g', grams: g, aisle: f.aisle, n: scaleN(f.per100, g / 100),
        note: (rule.keep > 0 ? 'insieme a: ' : 'al posto di: ') + ing0.name.toLowerCase() };
      repl.push(a); after += a.n.kcal;
    }
    used[rule.id] = used[rule.id] || rule;
    delta[rule.id] = (delta[rule.id] || 0) + (after - before) / serv;
    if (disabled.has(rule.id)) l.ingredients.push(copy(ing0)); else l.ingredients.push(...repl);
  }
  for (const r of Object.values(used)) res.changes.push({ id: r.id, title: r.title, detail: r.why, kcalDelta: delta[r.id], enabled: !disabled.has(r.id) });

  const side = hasTag(src, 'Contorno'), base = hasTag(src, 'Basi');
  const ps = perServing(l);
  let veg = 0;
  for (const i of l.ingredients) if (i.aisle === ORTO && !/(limon|lime|aglio|erbe|basilico|prezzemolo|rosmarino|banana|frutti|patat)/.test(i.name.toLowerCase())) veg += i.grams / serv;
  const vegan = hasTag(src, 'Vegana'), vegetarian = vegan || hasTag(src, 'Vegetariana');
  const addition = (f, name, grams, note) => {
    const a = { name, amount: Math.round(grams), unit: 'g', grams, aisle: f.aisle, n: scaleN(f.per100, grams / 100), note };
    l.ingredients.push(a); res.additions.push(a);
  };
  if (!sweet && !side && !base) {
    if (ps.prot < 18) {
      const missing = 20 - ps.prot;
      const key = vegan ? 'edamame' : vegetarian ? 'ceci' : hasFish(src) ? 'tonno' : 'pollo';
      const f = FOODS[key];
      let g = Math.min(150, Math.max(40, missing / (f.per100.prot / 100)));
      g = Math.round(g / 10) * 10;
      const on = !disabled.has('add-prot');
      if (on) addition(f, f.name, g * serv, 'aggiunta per le proteine');
      res.changes.push({ id: 'add-prot', title: `+ ${f.name} (${g} g a porzione)`, detail: `Il piatto aveva solo ${Math.round(ps.prot)} g di proteine a porzione: con questa aggiunta tiene sazi più a lungo.`, kcalDelta: f.per100.kcal * g / 100, enabled: on });
    }
    if (veg < 150) {
      const salad = src.tags.includes('Estate') || veg > 60;
      const f = FOODS[salad ? 'insalata' : 'broccoli'];
      const vname = salad ? 'Insalata mista' : 'Verdure di stagione (broccoli, zucchine, spinaci)';
      let g = Math.round((150 - veg) / 10) * 10; g = Math.max(60, Math.min(150, g));
      const on = !disabled.has('add-veg');
      if (on) addition(f, vname, g * serv, 'contorno per completare il pasto');
      res.changes.push({ id: 'add-veg', title: `+ ${salad ? 'Insalata mista' : 'Verdure di stagione'} (${g} g a porzione)`,
        detail: 'Una porzione di verdura aggiunge volume, fibre e micronutrienti con pochissime calorie. Mangiala per prima: arrivi al piatto principale con meno fame.', kcalDelta: f.per100.kcal * g / 100, enabled: on });
    }
  }
  if (sweet && !base && !disabled.has('portion')) {
    const cur = perServing(l);
    if (cur.kcal > 300 && serv >= 4) {
      const newServ = Math.ceil(serv * 1.25);
      res.changes.push({ id: 'portion', title: `Porzioni da ${serv} a ${newServ}`, detail: 'Stessa ricetta, fette un po\' più piccole (o monoporzioni in bicchierini e pirottini): la soddisfazione è la stessa.', kcalDelta: cur.kcal / newServ * serv - cur.kcal, enabled: true });
      l.servings = newServ;
    }
  } else if (sweet && !base && disabled.has('portion')) {
    res.changes.push({ id: 'portion', title: 'Porzioni più piccole', detail: 'Stessa ricetta, fette un po\' più piccole.', kcalDelta: 0, enabled: false });
  }
  const all = src.steps.join(' ').toLowerCase();
  if (/(^|[\s,.(])(frigg|fry|deep-fr)/.test(all)) res.tips.push('Friggitrice ad aria: 180 °C per 12-15 minuti con un cucchiaino d\'olio nebulizzato al posto della frittura.');
  if (all.includes('acqua di cottura') || all.includes('pasta water')) res.tips.push('L\'acqua di cottura ricca di amido dà cremosità senza grassi: usala per mantecare al posto di altro condimento.');
  if (sweet) {
    res.tips.push('Più aroma, meno zucchero: vaniglia, cannella, scorza di agrumi e un pizzico di sale fanno sembrare il dolce più dolce.');
    res.tips.push('Frutta fresca o cotta come decorazione al posto di glasse e coperture.');
  }
  if (base) res.tips.push('È una preparazione di base: i valori dipendono da come la condisci. Apri una ricetta completa per avere il piatto bilanciato.');
  if (side) res.tips.push('È un contorno: abbinalo a una fonte di proteine (pollo, salmone, tofu o uova) per farne un pasto completo.');
  if (!sweet && !base) res.tips.push('Metodo del piatto: metà verdura, un quarto proteine, un quarto carboidrati.');
  if (!res.changes.length) res.tips.unshift('Questa ricetta è già leggera: nessun ingrediente da sostituire.');
  res.tips.push('Valori indicativi, calcolati da tabelle di composizione medie. Non sostituiscono il parere di un nutrizionista.');
  l.steps = src.steps.map(st => {
    let b = st; const low = st.toLowerCase();
    for (const c of res.changes) {
      if (!c.enabled || c.id.startsWith('add-') || c.id === 'portion') continue;
      const r = used[c.id]; if (!r) continue;
      if (r.kw.some(k => k.length > 3 && low.includes(k))) {
        const what = c.title.includes('→') ? c.title.slice(c.title.indexOf('→') + 1).trim() : c.title.toLowerCase();
        b += '  → Versione leggera: ' + what + '.';
      }
    }
    return b;
  });
  res.light = l;
  return res;
}

function balanceScore(r) {
  const n = perServing(r);
  const dessert = hasTag(r, 'Dolce') || hasTag(r, 'Contorno') || hasTag(r, 'Basi');
  let s = 100;
  if (n.sat > 8) s -= (n.sat - 8) * 2.2;
  if (n.sug > 15) s -= (n.sug - 15) * 1.2;
  if (!dessert) {
    if (n.fib < 8) s -= (8 - n.fib) * 3;
    if (n.prot < 20) s -= (20 - n.prot) * 1.4;
    if (n.kcal > 700) s -= (n.kcal - 700) * 0.06;
  } else if (n.kcal > 350) s -= (n.kcal - 350) * 0.08;
  const fatPct = n.kcal > 0 ? n.fat * 9 / n.kcal : 0;
  if (fatPct > 0.4) s -= (fatPct - 0.4) * 80;
  return Math.max(5, Math.min(100, Math.round(s)));
}
const grade = s => s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 55 ? 'C' : s >= 40 ? 'D' : 'E';

// ===================== IMPASTI =====================
const STYLES = {
  NAPOLETANA: { label: 'Napoletana classica', desc: 'Cornicione alto e soffice, pochi minuti nel forno più caldo possibile' },
  TONDA: { label: 'Tonda romana', desc: 'Sottile e croccante, stesa con il mattarello' },
  TEGLIA: { label: 'In teglia', desc: 'Alta, alveolata e croccante sotto, maturata in frigo' },
  PALA: { label: 'Alla pala', desc: 'Lunga, leggerissima e molto idratata, cotta sulla pietra' },
  FOCACCIA: { label: 'Focaccia', desc: 'Alta e soffice, ricca d\'olio, in teglia' }
};
const TRAYS = [['25 × 35 cm', 875], ['30 × 40 cm', 1200], ['35 × 45 cm', 1575], ['Tonda Ø 32 cm', 804]];

function doughPreset(style) {
  const p = { NAPOLETANA: [62, 2.8, 0, 4, 250, 8, 0], TONDA: [55, 2.5, 4, 4, 180, 6, 0], TEGLIA: [75, 2.5, 3, 1, 0, 3, 24], PALA: [80, 2.5, 2.5, 2, 550, 3, 24], FOCACCIA: [75, 2.3, 5, 1, 0, 4, 0] }[style];
  return { style, hydration: p[0], salt: p[1], oil: p[2], count: p[3], ball: p[4] || 250, tray: 1, ambHours: p[5], fridgeHours: p[6], temp: 22, dryYeast: false, bakeHour: 20 };
}

const Dough = {
  usesTray: d => d.style === 'TEGLIA' || d.style === 'FOCACCIA',
  totalDough: d => Dough.usesTray(d) ? d.count * TRAYS[d.tray][1] * (d.style === 'FOCACCIA' ? 0.75 : 0.65) : d.count * d.ball,
  freshYeastPct(d) {
    const t = [[1, 4.0], [2, 2.0], [3, 1.3], [4, 0.95], [6, 0.6], [8, 0.42], [10, 0.32], [12, 0.26], [16, 0.18], [24, 0.11], [36, 0.07], [48, 0.05], [72, 0.035]];
    const eq = Math.max(1, d.ambHours + d.fridgeHours / 4);
    let pct = t[t.length - 1][1];
    for (let i = 0; i < t.length - 1; i++) {
      if (eq >= t[i][0] && eq <= t[i + 1][0]) {
        const f = (Math.log(eq) - Math.log(t[i][0])) / (Math.log(t[i + 1][0]) - Math.log(t[i][0]));
        pct = Math.exp(Math.log(t[i][1]) + f * (Math.log(t[i + 1][1]) - Math.log(t[i][1])));
        break;
      }
    }
    pct *= Math.pow(2, (22 - d.temp) / 8);
    return Math.max(0.02, pct);
  },
  yeastPct: d => d.dryYeast ? Dough.freshYeastPct(d) / 3 : Dough.freshYeastPct(d),
  flour: d => Dough.totalDough(d) / (1 + (d.hydration + d.salt + d.oil + Dough.yeastPct(d)) / 100),
  water: d => Dough.flour(d) * d.hydration / 100,
  saltG: d => Dough.flour(d) * d.salt / 100,
  oilG: d => Dough.flour(d) * d.oil / 100,
  yeastG: d => Dough.flour(d) * Dough.yeastPct(d) / 100,
  flourName: d => ({ NAPOLETANA: 'Farina 00 (W 260-300)', TONDA: 'Farina tipo 0 (W 240-260)', TEGLIA: 'Farina tipo 0 forte (W 300-330)', PALA: 'Farina forte (W 350) o 70% 00 + 30% manitoba', FOCACCIA: 'Farina tipo 0 (W 260-300)' })[d.style],
  g: v => v < 10 ? v.toFixed(1).replace('.', ',') : String(Math.round(v)),
  hrs: v => { const n = Math.round(v); return n === 1 ? '1 ora' : n + ' ore'; },
  schedule(d) {
    let start = d.bakeHour - (d.ambHours + d.fridgeHours + 0.5), off = 0;
    while (start < 0) { start += 24; off++; }
    let h = Math.floor(start), m = Math.round((start - h) * 60);
    if (m === 60) { h++; m = 0; }
    const day = off === 0 ? 'lo stesso giorno' : off === 1 ? 'il giorno prima' : off + ' giorni prima';
    const p = x => String(x).padStart(2, '0');
    return `Per infornare alle ${p(d.bakeHour)}:00 inizia a impastare ${day} alle ${p(h % 24)}:${p(m)}`;
  },
  build(d, base) {
    const r = copy(base), g = Dough.g, hrs = Dough.hrs;
    r.servings = d.count; r.ingredients = []; r.steps = [];
    const fl = Dough.flour(d), wa = Dough.water(d), sa = Dough.saltG(d), oi = Dough.oilG(d), ye = Dough.yeastG(d);
    const tray = Dough.usesTray(d), trayName = tray ? TRAYS[d.tray][0] : '';
    const unitName = tray ? (d.count === 1 ? 'teglia' : 'teglie') : (d.count === 1 ? 'pizza' : 'pizze');
    r.ingredients.push(ing('farina', Dough.flourName(d), Math.round(fl), 'g'));
    r.ingredients.push(ing('acqua', `Acqua (${g(d.hydration)}% di idratazione)`, Math.round(wa), 'ml'));
    r.ingredients.push(ing('lievito_birra', d.dryYeast ? 'Lievito di birra secco' : 'Lievito di birra fresco', Math.round(ye * 10) / 10, 'g'));
    r.ingredients.push(ing('sale', 'Sale fino', Math.round(sa * 10) / 10, 'g'));
    if (oi > 0) r.ingredients.push(ing('olio', 'Olio extravergine', Math.round(oi), 'g'));
    if (d.style === 'FOCACCIA') { r.ingredients.push(ing('olio', 'Olio per teglia e superficie', 40 * d.count, 'g')); r.ingredients.push(ing('erbe', 'Rosmarino e sale grosso', 3, 'g')); }
    if (d.style === 'PALA') r.ingredients.push(ing('farina', 'Semola rimacinata per la stesura', 40 * d.count, 'g'));
    r.description = `${STYLES[d.style].desc}. ${d.count} ${unitName}${tray ? ' da ' + trayName : ' da ' + g(d.ball) + ' g'}, idratazione ${g(d.hydration)}%.`;
    r.title = { NAPOLETANA: 'Impasto pizza napoletana', TONDA: 'Impasto pizza tonda romana', TEGLIA: 'Impasto pizza in teglia', PALA: 'Impasto pizza alla pala', FOCACCIA: 'Focaccia in teglia' }[d.style];
    r.minutes = 30;
    const yeastTxt = g(ye) + ' g di ' + (d.dryYeast ? 'lievito di birra secco' : 'lievito di birra fresco');
    let punt, appr;
    if (d.fridgeHours > 0) { punt = 1; appr = Math.max(1.5, d.ambHours - punt); } else { punt = Math.max(1, Math.min(2, d.ambHours / 3)); appr = Math.max(1, d.ambHours - punt); }
    const h = hrs(appr), hp = hrs(punt), hf = hrs(d.fridgeHours), S = r.steps;
    if (d.style === 'NAPOLETANA' || d.style === 'TONDA') {
      S.push(`Sciogli ${yeastTxt} in ${g(wa * 0.9)} ml di acqua fresca. Versa ${g(fl)} g di farina in una ciotola e aggiungi l'acqua poco alla volta, mescolando.`);
      S.push(`Sciogli ${g(sa)} g di sale nell'acqua rimasta e uniscila${oi > 0 ? ', poi aggiungi ' + g(oi) + ' g di olio' : ''}. Impasta per 12 minuti, finché l'impasto è liscio ed elastico.`);
      S.push(d.fridgeHours > 0 ? `Copri e lascia riposare ${hp} a temperatura ambiente, poi metti la ciotola in frigo per ${hf}.` : `Copri la ciotola e lascia riposare l'impasto per ${hp} (puntata).`);
      S.push(`Fai ${d.count} panetti da ${g(d.ball)} g: stacca l'impasto, piega i lembi sotto e arrotondali. Mettili in un contenitore infarinato e chiuso.`);
      S.push(`Lascia lievitare i panetti per ${h} a temperatura ambiente (circa ${g(d.temp)} °C), finché raddoppiano.`);
      if (d.style === 'NAPOLETANA') {
        S.push('Accendi il forno al massimo (250-280 °C) con la pietra o l\'acciaio dentro per 45 minuti.');
        S.push('Stendi il panetto con le dita dal centro verso l\'esterno, lasciando un cornicione di 1-2 cm. Non usare il mattarello.');
        S.push('Condisci e cuoci per 7 minuti sulla pietra rovente, aggiungendo la mozzarella negli ultimi 2 minuti.');
      } else {
        S.push('Accendi il forno a 250 °C con la teglia o la pietra dentro per 30 minuti.');
        S.push('Stendi il panetto con il mattarello fino a 2-3 mm di spessore, cornicione basso.');
        S.push('Condisci e cuoci in forno per 8 minuti, finché il fondo è croccante e dorato.');
      }
    } else if (tray) {
      S.push(`Sciogli ${yeastTxt} in ${g(wa * 0.8)} ml di acqua fresca, aggiungi ${g(fl)} g di farina e mescola per 5 minuti.`);
      S.push(`Aggiungi ${g(sa)} g di sale e l'acqua rimasta a filo, poco alla volta; infine ${g(oi)} g di olio. Impasta per 10 minuti finché l'impasto è liscio e si stacca dalla ciotola.`);
      S.push('Fai 3 giri di pieghe a 15 minuti di distanza: con la mano bagnata tira un lembo d\'impasto e ripiegalo sopra, girando la ciotola.');
      S.push(d.fridgeHours > 0 ? `Copri e metti in frigo a maturare per ${hf}.` : `Copri e lascia lievitare per ${hp}, finché raddoppia.`);
      S.push(`Ungi ${d.count === 1 ? 'la teglia' : 'le ' + d.count + ' teglie'} da ${trayName}, adagia l'impasto e lascia riposare per ${h} a temperatura ambiente.`);
      if (d.style === 'FOCACCIA') {
        S.push('Allarga con le dita fino agli angoli, premi con i polpastrelli per fare le fossette e versa sopra un\'emulsione di olio e acqua. Sale grosso e rosmarino.');
        S.push('Cuoci in forno a 230 °C per 22 minuti, nella parte bassa.');
      } else {
        S.push('Allarga l\'impasto con i polpastrelli fino agli angoli, senza schiacciare tutta l\'aria.');
        S.push('Cuoci in forno a 250 °C nella parte bassa per 12 minuti con il solo pomodoro, poi aggiungi la mozzarella e cuoci 6 minuti nella parte alta.');
      }
    } else {
      S.push(`Sciogli ${yeastTxt} in ${g(wa * 0.7)} ml di acqua fresca, aggiungi ${g(fl)} g di farina e mescola per 5 minuti.`);
      S.push(`Aggiungi l'acqua rimasta a filo in 3 volte (bassinage), poi ${g(sa)} g di sale e ${g(oi)} g di olio. Impasta finché l'impasto è lucido e incordato.`);
      S.push('Fai 3 giri di pieghe a 20 minuti di distanza, con le mani bagnate.');
      S.push(`Copri e metti in frigo a maturare per ${hf}.`);
      S.push(`Fai ${d.count} panetti da ${g(d.ball)} g con delicatezza e lasciali lievitare ${h} a temperatura ambiente su un piano infarinato, coperti.`);
      S.push('Accendi il forno a 250 °C con la pietra dentro per 45 minuti.');
      S.push('Rovescia il panetto sulla semola e stendi allungandolo con i polpastrelli fino a 60 × 25 cm circa, senza schiacciare le bolle.');
      S.push('Trasferisci sulla pietra e cuoci 8 minuti, poi condisci e completa la cottura per 3 minuti.');
    }
    return r;
  }
};

// ===================== STAMPI =====================
const MOLDS = [16, 18, 20, 22, 24, 26, 28, 30];
function scaleMold(base, baseD, d) {
  const f = Math.pow(d / baseD, 2), r = copy(base);
  for (const i of r.ingredients) {
    let ratio = f;
    if (i.unit === 'pz' && i.amount > 0) { const na = Math.max(1, Math.round(i.amount * f)); ratio = na / i.amount; i.amount = na; }
    else i.amount = Math.round(i.amount * f * 10) / 10;
    i.grams *= ratio; i.n = scaleN(i.n, ratio);
  }
  r.servings = Math.max(2, Math.round(base.servings * f));
  r.steps = r.steps.map(s => s.split(baseD + ' cm').join(d + ' cm'));
  if (d !== baseD) r.description = base.description + ` (Dosi per stampo da ${d} cm.)`;
  return r;
}

// ===================== FRIGO =====================
const STAPLES = ['sale', 'pepe', 'acqua', 'olio', 'brodo', 'spezie', 'salt', 'pepper', 'water', 'oil', 'zucchero', 'sugar', 'aceto'];
const SUGGEST = ['uova', 'pasta', 'riso', 'farina', 'latte', 'burro', 'parmigiano', 'mozzarella', 'pomodori', 'passata', 'cipolla', 'aglio', 'zucchine', 'spinaci', 'patate', 'carote',
  'pollo', 'macinato', 'tonno', 'salmone', 'ceci', 'lenticchie', 'yogurt', 'pane', 'tortilla', 'limone', 'basilico', 'avocado', 'funghi', 'feta', 'prosciutto', 'banana', 'cioccolato', 'tofu'];
const pnorm = s => s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-zàèéìòù' ]/g, ' ').replace(/\s+/g, ' ').trim();
const stem = w => w.length > 4 ? w.slice(0, -1) : w;
const isStaple = ing => { const n = ' ' + pnorm(ing) + ' '; return STAPLES.some(s => n.includes(' ' + s)); };
function pantryMatches(ingName, item) {
  const n = pnorm(ingName), it = pnorm(item);
  if (!it) return false;
  const fi = matchFood(n), ft = matchFood(it);
  if (fi && ft && fi.key === ft.key) return true;
  if (ft && ft.key === 'uova' && fi && (fi.key === 'tuorlo' || fi.key === 'albume')) return true;
  for (const w of it.split(' ')) { if (w.length < 3) continue; if (!(' ' + n).includes(' ' + stem(w))) return false; }
  return true;
}
const pantryHas = (fridge, staples, name) => (staples && isStaple(name)) || fridge.some(i => pantryMatches(name, i));
function pantryMatch(fridge, staples, r) {
  const m = { have: 0, total: 0, missing: [], used: [] };
  for (const i of r.ingredients) {
    if (i.unit === 'q.b.' && isStaple(i.name)) continue;
    if (staples && isStaple(i.name)) continue;
    m.total++;
    if (pantryHas(fridge, staples, i.name)) { m.have++; m.used.push(i.name); } else m.missing.push(i.name);
  }
  m.ratio = m.total ? m.have / m.total : 0;
  return m;
}

// ===================== PASSAGGI =====================
const KINDS = [
  ['fridge', ' in frigo', 'frigorifero', 'fridge', 'refrigerat', 'congelat'],
  ['oven', 'forno', 'inforna', 'pietra', 'oven', 'bake', 'baking'],
  ['fry', 'frigg', 'fry ', 'frying', 'deep-fr', 'frittura'],
  ['rise', 'lievitare', 'lievitazione', 'lievitino', 'riposare', 'riposo', 'raddoppi', 'puntata', 'maturare', 'proof', 'let rise', 'rest '],
  ['roll', 'stend', 'mattarello', 'roll out', 'rolling', 'sfoglia', 'allarga'],
  ['knead', 'impast', 'knead', 'panetti', 'panetto', 'pieghe', 'staglio', 'arrotond', 'palline', 'fontana'],
  ['whisk', 'monta', 'frusta', 'sbatti', 'whisk', 'beat', 'emulsion', 'spumos'],
  ['blend', 'frulla', 'blend', 'mixer', 'food processor'],
  ['chop', 'taglia', 'trita', 'affetta', 'chop', 'slice', 'dice', 'julienne', 'grattugi', 'sbriciol', 'mince'],
  ['pot', 'bollore', 'lessa', 'acqua salata', 'cuoci la pasta', 'cuoci il riso', 'cuoci gli', 'brodo', 'boil', 'simmer', 'pentola', 'tegame', 'sugo', 'pot '],
  ['pan', 'padella', 'rosol', 'soffrigg', 'salta', 'sauté', 'saute', 'skillet', 'pan ', 'per lato', 'tosta', 'sfuma'],
  ['pour', 'versa', 'pour', 'inzuppa', 'sciogli', 'drizzle', 'irrora'],
  ['plate', 'servi', 'impiatta', 'completa', 'decora', 'serve', 'garnish', 'spolvera', 'componi', 'buon appetito'],
  ['mix', 'mescola', 'unisci', 'aggiungi', 'incorpora', 'mix', 'combine', 'stir', 'condisci']
];
const KIND_LABEL = { fridge: 'In frigo', oven: 'In forno', fry: 'Frittura', rise: 'Lievitazione / riposo', roll: 'Stendere', knead: 'Impastare', whisk: 'Montare', blend: 'Frullare',
  chop: 'Tagliare', pot: 'In pentola', pan: 'In padella', pour: 'Versare', plate: 'Servire', mix: 'Mescolare' };
function classify(text) {
  const t = ' ' + text.toLowerCase() + ' ';
  for (const k of KINDS) for (let i = 1; i < k.length; i++) if (t.includes(k[i])) return k[0];
  return 'mix';
}
function temperature(text) {
  const m = /(\d{2,3})\s*°\s*C/.exec(text);
  return m ? m[1] + '°' : text.toLowerCase().includes('massimo') ? 'MAX' : '';
}
function seconds(text) {
  const m = /(\d+)(?:\s*[-–]\s*(\d+))?\s*(minut[oi]|min\b|minutes?|ore\b|ora\b|hours?|secondi|seconds?)/i.exec(text);
  if (!m) return 0;
  const v = parseInt(m[2] || m[1], 10), u = m[3].toLowerCase();
  if (u.startsWith('or') || u.startsWith('hour')) return v * 3600;
  if (u.startsWith('sec')) return v;
  return v * 60;
}
const fmtSecs = s => s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ===================== RIGHE DELL'EDITOR =====================
function parseLine(line) {
  let t = line.trim().replace(/^[-•*]\s*/, '');
  let amount = 0, unit = '', name = t;
  const m = /^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)?\s*(kg|g|gr|grammi|ml|l|litri?|cl|pz|pezzi|cucchiaio|cucchiai|cucchiaino|cucchiaini|spicchio|spicchi|fetta|fette|tazzina|tazzine|bicchiere|bicchieri|q\.?b\.?)?\b\.?\s*(?:di\s+|d')?(.*)$/i.exec(t);
  if (m) {
    let num = m[1], u = m[2], rest = m[3];
    if (num) {
      num = num.replace(',', '.').replace(/\s/g, '');
      if (num.includes('/')) { const p = num.split('/'); amount = parseFloat(p[0]) / Math.max(1, parseFloat(p[1])); } else amount = parseFloat(num);
    }
    if (u) {
      unit = u.toLowerCase();
      if (unit === 'gr' || unit === 'grammi') unit = 'g';
      if (unit.startsWith('litr')) unit = 'l';
      if (unit.startsWith('pezz')) unit = 'pz';
      if (unit.replace(/\./g, '') === 'qb') unit = 'q.b.';
    } else if (num) unit = 'pz';
    if (rest && rest.trim()) name = rest.trim();
  }
  const back = /^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|pz|cucchiai?|cucchiaini?)?$/i.exec(t);
  if (amount === 0 && back) { name = back[1].trim(); amount = parseFloat(back[2].replace(',', '.')); unit = back[3] ? back[3].toLowerCase() : 'pz'; }
  const low = name.toLowerCase();
  if (low.endsWith(' q.b.') || low.endsWith(' qb')) { name = name.slice(0, name.lastIndexOf(' ')).trim(); unit = 'q.b.'; }
  if (name) name = name[0].toUpperCase() + name.slice(1);
  return ingredient(name, amount, unit, 0, null);
}
function lineOf(i) {
  if (i.unit === 'q.b.') return i.name + ' q.b.';
  if (!(i.amount > 0)) return i.name;
  return fmtNum(i.amount) + ' ' + (i.unit === 'pz' ? '' : i.unit + ' ') + i.name;
}

// ===================== EMOJI PER LE COPERTINE =====================
const EMOJI = [['🍕', 'pizza', 'impasto', 'panetti'], ['🫓', 'focaccia', 'piadina', 'pane', 'bread'], ['🍝', 'pasta', 'spaghetti', 'carbonara', 'nerano', 'penne', 'rigatoni', 'linguine', 'lasagn', 'gnocch', 'ragù', 'ragu'],
  ['🍚', 'riso', 'risotto', 'rice', 'bowl', 'poke'], ['🍰', 'torta', 'cake', 'tiramis', 'cheesecake', 'pan di spagna', 'dolce', 'frolla', 'crostata'], ['🥞', 'crêpe', 'crepe', 'pancake', 'oats', 'colazione'],
  ['🍪', 'biscott', 'cookie'], ['🍔', 'burger', 'tacos', 'smash'], ['🌯', 'wrap', 'tortilla', 'burrito'], ['🍳', 'shakshuka', 'uova', 'frittata', 'egg'], ['🍗', 'pollo', 'chicken'],
  ['🐟', 'salmone', 'pesce', 'tonno', 'fish', 'salmon'], ['🥗', 'insalata', 'salad', 'cetrioli'], ['🍲', 'zuppa', 'minestra', 'ceci', 'lenticchie', 'legumi', 'curry', 'stufato'],
  ['🥩', 'manzo', 'bistecca', 'carne', 'beef'], ['🍅', 'sugo', 'pomodoro', 'salsa'], ['🥛', 'besciamella', 'crema'], ['🥦', 'verdur', 'vegana', 'tofu']];
function emoji(r) {
  const t = (r.title + ' ' + r.tags.join(' ')).toLowerCase();
  for (const e of EMOJI) for (let i = 1; i < e.length; i++) if (t.includes(e[i])) return e[0];
  return '🍽️';
}


// ===================== PARAMETRI PER OGNI RICETTA =====================
const RX = {
  flour: /\b(farin|semol|manitob|flour|fecola|amido di mais)/i,
  liquid: /\b(acqua|latte|water|milk|birra)\b(?!.*(cottura|per la pentola|per lessare|bollente per))/i,
  salt: /^\s*sale\b|\bsalt\b/i,
  fat: /\b(olio|burro|strutto|butter|oil|lard)\b/i,
  yeast: /\blievito\b(?!.*(dolci|vanigl|chimic|istantaneo per))|\byeast\b|\bmadre\b|\bpasta madre\b/i,
  chem: /lievito.*(dolci|vanigl|chimic)|bicarbonat|baking (powder|soda)|cremor tartaro/i,
  cake: /\b(torta|cake|cheesecake|crostata|pan di spagna|ciambell|chiffon|sacher)/i
};
const isQb = i => i.unit === 'q.b.' || !(i.grams > 0);
const yeastKind = name => /secco|dry|disidrat|istantaneo/i.test(name) ? 'dry' : /madre|sourdough|lievitino/i.test(name) ? 'madre' : 'fresh';

/** Riconosce che tipo di ricetta è, per proporre i parametri giusti. */
function analyze(r) {
  const idx = re => r.ingredients.map((i, k) => k).filter(k => !isQb(r.ingredients[k]) && re.test(r.ingredients[k].name));
  const flour = idx(RX.flour).filter(k => !/stesura|spolver|per la spianatoia|per il piano/i.test(r.ingredients[k].name));
  const yeast = idx(RX.yeast).filter(k => !RX.chem.test(r.ingredients[k].name));
  const liquid = idx(RX.liquid).filter(k => !yeast.includes(k)), salt = idx(RX.salt), fat = idx(RX.fat);
  const g = ks => ks.reduce((a, k) => a + r.ingredients[k].grams, 0);
  const flourG = g(flour), liquidG = g(liquid);
  const title = (r.title + ' ' + r.description).toLowerCase();
  const bready = /pizz|focacc|pane\b|pane |panin|piadin|bagel|brioche|grissin|taralli|frisell|ciabatt|baguette|pan bauletto|crackers|impasto/.test(title);
  const isDough = flour.length > 0 && flourG >= 120 && liquidG > 0 && (yeast.length > 0 || bready) && !RX.chem.test(r.ingredients.map(i => i.name).join(' '));
  // stampo: diametro citato nei passaggi o torta senza diametro
  const text = r.steps.join(' ') + ' ' + r.description;
  const m = /(?:stampo|tortiera|cerchio|teglia)[^.]{0,40}?(?:Ø|diametro|da)?\s*(\d{2})\s*cm/i.exec(text);
  let mold = m ? parseInt(m[1], 10) : 0;
  if (mold && (mold < 14 || mold > 34)) mold = 0;
  const isCake = RX.cake.test(r.title) || (hasTag(r, 'Dolce') && /stampo|tortiera/i.test(text));
  if (!mold && isCake && !isDough) mold = 24;
  let style = null;
  if (/pizz|focacc/.test(title)) style = /focacc/.test(title) ? 'FOCACCIA' : /teglia/.test(title) ? 'TEGLIA' : /pala|pinsa/.test(title) ? 'PALA' : /romana|tonda|sottile|scrocchiarella/.test(title) ? 'TONDA' : 'NAPOLETANA';
  return {
    flour, liquid, salt, fat, yeast, flourG, liquidG, isDough, style, mold, moldGuessed: !m && mold > 0,
    hydration: flourG ? liquidG / flourG * 100 : 0,
    saltPct: flourG ? g(salt) / flourG * 100 : 0,
    fatPct: flourG ? g(fat) / flourG * 100 : 0,
    yeastPct: flourG ? g(yeast) / flourG * 100 : 0,
    yeastKind: yeast.length ? yeastKind(r.ingredients[yeast[0]].name) : 'fresh'
  };
}

function scaleIng(i, f) { i.amount = Math.round(i.amount * f * 10) / 10; i.grams *= f; i.n = scaleN(i.n, f); }

/** Applica i parametri dell'impasto (percentuali sulla farina) alla ricetta, senza cambiare gli altri ingredienti. */
function applyDough(r, a, p) {
  const out = copy(r);
  const setPct = (ks, pct) => {
    const cur = ks.reduce((s, k) => s + out.ingredients[k].grams, 0);
    const target = a.flourG * pct / 100;
    if (cur > 0) ks.forEach(k => scaleIng(out.ingredients[k], target / cur));
  };
  setPct(a.liquid, p.hydration);
  if (a.salt.length) setPct(a.salt, p.salt);
  else if (p.salt > 0) out.ingredients.push(ingredient('Sale fino', Math.round(a.flourG * p.salt / 10) / 10, 'g', 0, 'salt'));
  if (a.fat.length) setPct(a.fat, p.fat);
  else if (p.fat > 0) out.ingredients.push(ingredient('Olio extravergine', Math.round(a.flourG * p.fat / 100), 'g', 0, 'olive oil'));
  // lievito: per percentuale o calcolato sui tempi di lievitazione
  let pct = p.yeast;
  if (p.byTime) {
    const fresh = Dough.freshYeastPct({ ambHours: p.ambHours, fridgeHours: p.fridgeHours, temp: p.temp });
    pct = p.yeastKind === 'dry' ? fresh / 3 : p.yeastKind === 'madre' ? Math.min(35, fresh * 10) : fresh;
  }
  const yName = p.yeastKind === 'dry' ? 'Lievito di birra secco' : p.yeastKind === 'madre' ? 'Lievito madre (rinfrescato)' : 'Lievito di birra fresco';
  if (a.yeast.length) {
    const k = a.yeast[0], y = out.ingredients[k];
    a.yeast.slice(1).forEach(j => { out.ingredients[j].amount = 0; out.ingredients[j].grams = 0; out.ingredients[j].n = N(); });
    const g = a.flourG * pct / 100;
    const key = p.yeastKind === 'madre' ? 'farina' : 'lievito_birra';
    const nn = FOODS[key] ? scaleN(FOODS[key].per100, g / 100) : N();
    Object.assign(y, { name: yName, amount: Math.round(g * 10) / 10, unit: 'g', grams: g, n: nn, note: p.byTime ? 'calcolato sui tempi di lievitazione' : y.note });
  } else if (pct > 0) {
    out.ingredients.push(ing('lievito_birra', yName, Math.round(a.flourG * pct / 10) / 10, 'g'));
  }
  out.ingredients = out.ingredients.filter(i => !(i.amount === 0 && i.grams === 0 && i.unit !== 'q.b.' && i.n.kcal === 0 && a.yeast.length && /lievito/i.test(i.name)));
  return out;
}

/** Testo con i tempi dell'impasto (per le ricette dal web). */
function doughTimeline(p) {
  return Dough.schedule({ bakeHour: p.bakeHour, ambHours: p.ambHours, fridgeHours: p.fridgeHours });
}

/** Scala tutta la ricetta di un fattore (usato per "ho solo 400 g di…"). */
function scaleRecipe(r, f) { const out = copy(r); out.ingredients.forEach(i => scaleIng(i, f)); return out; }

Object.assign(RF, { setCustomFoods, normName, effN, unknownIngredients, isFryingOil, analyze, applyDough, doughTimeline, scaleRecipe, AISLES, FOODS, N, scaleN, matchFood, aisleOf, toGrams, ingredient, copy, normRecipe, total, perServing, hasTag, fmtNum, quantityLabel,
  lighten, balanceScore, grade, STYLES, TRAYS, doughPreset, Dough, MOLDS, scaleMold, SUGGEST, pnorm, isStaple, pantryHas, pantryMatch,
  classify, KIND_LABEL, temperature, seconds, fmtSecs, parseLine, lineOf, emoji });
