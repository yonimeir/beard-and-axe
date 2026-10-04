/**
 * זקן וגרזן (Beard and Axe) - מנוע המשחק המלא והמתוקן
 */

const GameState = {
    LOBBY: 'lobby',
    ARMORY: 'armory',
    BATTLE: 'battle',
    STUDIO: 'studio',
    SHOP: 'shop',
    SETTINGS: 'settings'
};

let state = GameState.LOBBY;
let lastState = GameState.LOBBY;

const ARMORY_BATCH_SIZE = 5;
const BATTLE_BATCH_SIZE = 5;
const MAX_ENEMY_HP_BASE = 100;

let maxEnemyHP = 100;
let enemyHP = 100;
let playerHP = 100;
let score = 0;
let currentLevel = 1;

let isTurnResolving = false;
let isArmoryTransitioning = false;
let battleTimer = null;
let TIME_LIMIT = 5000;
let startTime = 0;

let armoryQueue = [];
let battleQueue = [];
let currentWordIndex = 0;

let unlockedItems = [];
let equippedItems = { beard: null, axe: null, shield: null, hat: null, accessory: null };
let damageMultiplier = 1;
let damageReduction = 0;
let extraTime = 0;

const BG_COLORS = [
    'bg-gray-900', 'bg-red-950', 'bg-amber-950', 'bg-yellow-950',
    'bg-lime-950', 'bg-emerald-950', 'bg-cyan-950', 'bg-blue-950',
    'bg-indigo-950', 'bg-purple-950', 'bg-fuchsia-950', 'bg-rose-950'
];

const SHOP_ITEMS = [
    { id: 'pizza', name: 'פיצה חמה', icon: '🍕', desc: 'מרפא 50 חיים', price: 100, type: 'consumable' },
    { id: 'potion_max', name: 'שיקוי קסם', icon: '💊', desc: 'מרפא חיים מלאים (100)', price: 200, type: 'consumable' },
    { id: 'axe_gold', name: 'גרזן זהב', icon: '🪓', desc: 'נזק כפול (פי 2)', price: 500, type: 'axe' },
    { id: 'axe_diamond', name: 'גרזן יהלום', icon: '💎', desc: 'נזק משולש (פי 3)', price: 1000, type: 'axe' },
    { id: 'shield_wood', name: 'מגן עץ', icon: '🛡️', desc: 'מפחית 10 נזק מהאויב', price: 400, type: 'shield' },
    { id: 'shield_iron', name: 'מגן ברזל', icon: '🛡️', desc: 'מפחית 20 נזק מהאויב', price: 750, type: 'shield' },
    { id: 'hat_top', name: 'כובע קוסמים', icon: '🎩', desc: 'סטייל מלכותי', price: 300, type: 'hat' },
    { id: 'crown', name: 'כתר זהב', icon: '👑', desc: 'למלך הזירה', price: 500, type: 'hat' },
    { id: 'sunglasses', name: 'משקפי שמש', icon: '🕶️', desc: 'סטייל מגניב', price: 150, type: 'accessory' },
    { id: 'stopwatch', name: 'שעון עצר', icon: '⏳', desc: 'תוספת 1.5 שניות לטיימר הקרב', price: 300, type: 'accessory' },
    { id: 'beard_pink', name: 'זקן ורוד', icon: '🎅', desc: 'זקן ורוד זוהר', price: 250, type: 'beard' },
    { id: 'beard_blue', name: 'זקן תכלת', icon: '🎅', desc: 'זקן תכלת קפוא', price: 250, type: 'beard' }
];

const DEFAULT_WORDS = [
    { he: "תפוח", en: "APPLE" },
    { he: "כלב", en: "DOG" },
    { he: "חתול", en: "CAT" },
    { he: "לרוץ", en: "RUN" },
    { he: "ספר", en: "BOOK" },
    { he: "בית", en: "HOUSE" },
    { he: "בטוח", en: "SAFE" },
    { he: "ברור", en: "CLEAR" },
    { he: "דאגה", en: "WORRY" },
    { he: "אמיץ", en: "BRAVE" },
    { he: "לבד", en: "ALONE" },
    { he: "אבוד", en: "LOST" },
    { he: "מפתח", en: "KEY" },
    { he: "מהר", en: "QUICK" },
    { he: "נחמד", en: "NICE" },
    { he: "משעמם", en: "BORING" },
    { he: "חבר", en: "FRIEND" },
    { he: "משפחה", en: "FAMILY" },
    { he: "מוכן", en: "READY" },
    { he: "זמן", en: "TIME" },
    { he: "למטה", en: "DOWN" },
    { he: "מדרגות", en: "STAIRS" },
    { he: "דלת", en: "DOOR" },
    { he: "עט", en: "PEN" },
    { he: "רעיון", en: "IDEA" },
    { he: "נייר", en: "PAPER" },
    { he: "צוות", en: "TEAM" }
];

let GAME_WORDS = [...DEFAULT_WORDS];

// --- SOUND & SPEECH ENGINE ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function initAudio() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        if (type === 'grab') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(350, now);
            osc.frequency.linearRampToValueAtTime(550, now + 0.08);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.08);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'success') {
            const osc2 = audioCtx.createOscillator();
            osc.type = 'square';
            osc2.type = 'sine';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
            osc2.frequency.setValueAtTime(500, now);
            osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.35);
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc2.start(now);
            osc.stop(now + 0.35);
            osc2.stop(now + 0.35);
        } else if (type === 'buy') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1600, now + 0.12);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'attack') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.2);

            setTimeout(() => {
                const oscImp = audioCtx.createOscillator();
                const gainImp = audioCtx.createGain();
                const t2 = audioCtx.currentTime;
                oscImp.type = 'square';
                oscImp.frequency.setValueAtTime(100, t2);
                oscImp.frequency.exponentialRampToValueAtTime(25, t2 + 0.3);
                gainImp.gain.setValueAtTime(0.35, t2);
                gainImp.gain.exponentialRampToValueAtTime(0.01, t2 + 0.3);
                oscImp.connect(gainImp);
                gainImp.connect(audioCtx.destination);
                oscImp.start(t2);
                oscImp.stop(t2 + 0.3);
            }, 180);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.25);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.linearRampToValueAtTime(70, now + 0.25);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'victory') {
            const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
            let time = now;
            notes.forEach((note) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.type = 'triangle';
                o.frequency.setValueAtTime(note, time);
                g.gain.setValueAtTime(0.12, time);
                g.gain.exponentialRampToValueAtTime(0.01, time + 0.28);
                o.connect(g);
                g.connect(audioCtx.destination);
                o.start(time);
                o.stop(time + 0.28);
                time += 0.09;
            });
        }
    } catch (e) {
        console.warn("Audio error:", e);
    }
}

const synth = window.speechSynthesis;
function speak(text) {
    if (!synth) return;
    try {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.95;
        synth.speak(u);
    } catch (e) {
        console.warn("Speech error:", e);
    }
}

// --- PROFILE MANAGER ---
const ProfileManager = {
    profiles: {},
    currentProfile: null,

    init() {
        this.profiles = JSON.parse(localStorage.getItem('grimble_profiles')) || {};
        const savedProfileName = localStorage.getItem('grimble_active_profile');

        if (savedProfileName && this.profiles[savedProfileName]) {
            this.select(savedProfileName);
        } else if (Object.keys(this.profiles).length > 0) {
            this.renderProfileList();
            document.getElementById('profile-selection-ui').classList.remove('hidden');
        } else {
            // First time ever: create default player or show modal
            this.create("יוני", true);
        }
    },

    create(name, silent = false) {
        const cleanName = name ? name.trim() : "";
        if (!cleanName) {
            alert("נא להזין שם שחקן!");
            return;
        }
        if (this.profiles[cleanName]) {
            alert("שם שחקן זה כבר קיים!");
            return;
        }

        this.profiles[cleanName] = {
            score: 0,
            maxLevel: 1,
            playerHP: 100,
            items: [],
            equipped: { beard: null, axe: null, shield: null, hat: null, accessory: null },
            words: [...DEFAULT_WORDS]
        };

        this.saveProfiles();
        this.select(cleanName);
        const input = document.getElementById('new-profile-name');
        if (input) input.value = '';
    },

    delete(name) {
        if (!confirm(`האם אתה בטוח שברצונך למחוק את הפרופיל "${name}"?`)) return;
        delete this.profiles[name];
        this.saveProfiles();

        if (this.currentProfile === name) {
            this.currentProfile = null;
            localStorage.removeItem('grimble_active_profile');
            const remaining = Object.keys(this.profiles);
            if (remaining.length > 0) {
                this.select(remaining[0]);
            } else {
                this.renderProfileList();
                document.getElementById('profile-selection-ui').classList.remove('hidden');
            }
        } else {
            this.renderProfileList();
        }
    },

    select(name) {
        if (!this.profiles[name]) return;
        this.currentProfile = name;
        localStorage.setItem('grimble_active_profile', name);
        const data = this.profiles[name];

        score = data.score || 0;
        playerHP = (data.playerHP !== undefined && data.playerHP > 0) ? data.playerHP : 100;
        unlockedItems = data.items || [];
        equippedItems = data.equipped || { beard: null, axe: null, shield: null, hat: null, accessory: null };

        // Ensure words exist
        if (!data.words || data.words.length === 0) {
            data.words = [...DEFAULT_WORDS];
        }
        GAME_WORDS = data.words;

        // Current level (Starts from highest unlocked or default 1)
        currentLevel = data.maxLevel || 1;
        document.getElementById('level-display').innerText = currentLevel;
        maxEnemyHP = Math.floor(MAX_ENEMY_HP_BASE * Math.pow(1.2, currentLevel - 1));

        changeLevelBackground();
        applyCustomizations();

        document.getElementById('score-display').innerText = score;
        document.getElementById('shop-coins').innerText = score;
        document.getElementById('home-title').innerText = "הבית של " + name;

        document.getElementById('profile-selection-ui').classList.add('hidden');
    },

    saveData() {
        if (!this.currentProfile) return;
        const currentMax = this.profiles[this.currentProfile].maxLevel || 1;
        const newMax = Math.max(currentMax, currentLevel);

        this.profiles[this.currentProfile] = {
            score: score,
            maxLevel: newMax,
            playerHP: playerHP,
            items: unlockedItems,
            equipped: equippedItems,
            words: GAME_WORDS
        };
        this.saveProfiles();
    },

    saveProfiles() {
        localStorage.setItem('grimble_profiles', JSON.stringify(this.profiles));
        this.renderProfileList();
    },

    renderProfileList() {
        const list = document.getElementById('profile-list');
        if (!list) return;
        list.innerHTML = '';

        const names = Object.keys(this.profiles);
        if (names.length === 0) {
            list.innerHTML = `<p class="text-gray-400 text-sm italic">אין שחקנים שמורים. צור שחקן חדש למטה!</p>`;
            return;
        }

        names.forEach(name => {
            const p = this.profiles[name];
            const maxLvl = p.maxLevel || 1;

            const card = document.createElement('div');
            card.className = "bg-gray-800/90 border border-gray-600 hover:border-blue-400 rounded-xl p-3 flex flex-col items-center justify-between gap-2 shadow-lg min-w-[140px] transition-all";

            card.innerHTML = `
                <div class="text-center cursor-pointer w-full" onclick="ProfileManager.select('${name}')">
                    <div class="text-lg font-bold text-white">${name}</div>
                    <div class="text-xs text-yellow-300 mt-1 flex justify-center gap-2">
                        <span>🏆 ${p.score || 0}</span>
                        <span>⭐ Lvl ${maxLvl}</span>
                    </div>
                </div>
                <div class="flex gap-2 w-full mt-1">
                    <button onclick="ProfileManager.select('${name}')" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 px-2 rounded-lg transition-colors">
                        בחר
                    </button>
                    <button onclick="ProfileManager.delete('${name}')" class="bg-red-900/60 hover:bg-red-700 text-red-200 text-xs py-1.5 px-2 rounded-lg transition-colors" title="מחק פרופיל">
                        🗑️
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
    },

    addWord(he, en) {
        const newWord = { he, en };
        GAME_WORDS.push(newWord);
        this.saveData();
        renderWordEditorList();
    },

    removeWord(index) {
        if (GAME_WORDS.length <= 5) {
            alert("חייבות להישאר לפחות 5 מילים במאגר המשחק!");
            return;
        }
        GAME_WORDS.splice(index, 1);
        this.saveData();
        renderWordEditorList();
    }
};

// Global wrappers for HTML onclicks
function createNewProfile() {
    const input = document.getElementById('new-profile-name');
    const name = input ? input.value.trim() : '';
    ProfileManager.create(name);
}

function switchProfile() {
    returnToMenu();
    ProfileManager.renderProfileList();
    document.getElementById('profile-selection-ui').classList.remove('hidden');
}

function startFromLevelOne() {
    currentLevel = 1;
    playerHP = 100;
    maxEnemyHP = MAX_ENEMY_HP_BASE;
    enemyHP = maxEnemyHP;
    document.getElementById('level-display').innerText = currentLevel;
    changeLevelBackground();
    ProfileManager.saveData();
    document.getElementById('lose-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    returnToMenu();
}

function updateScore(amount) {
    score += amount;
    ProfileManager.saveData();
    document.getElementById('score-display').innerText = score;
    document.getElementById('shop-coins').innerText = score;
}

// --- SHOP & CUSTOMIZATION ---
function toggleShop() {
    const shop = document.getElementById('shop-overlay');
    if (shop.classList.contains('hidden')) {
        document.getElementById('shop-coins').innerText = score;
        renderShopItems();
        shop.classList.remove('hidden');
        state = GameState.SHOP;
    } else {
        shop.classList.add('hidden');
        state = lastState;
    }
}

function renderShopItems() {
    const list = document.getElementById('shop-items-container');
    if (!list) return;
    list.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
        const div = document.createElement('div');
        div.className = "bg-gray-800 p-3 rounded-xl border border-gray-700 flex flex-col items-center justify-between text-center shadow-md";

        let actionBtn = '';
        const isUnlocked = unlockedItems.includes(item.id);
        const isEquipped = (equippedItems[item.type] === item.id);

        if (item.type === 'consumable') {
            actionBtn = `<button onclick="buyItem('${item.id}', ${item.price})" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs w-full font-bold shadow transition-colors">${item.price} 🏆 קנה</button>`;
        } else {
            if (!isUnlocked) {
                actionBtn = `<button onclick="buyItem('${item.id}', ${item.price})" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs w-full font-bold shadow transition-colors">${item.price} 🏆 קנה</button>`;
            } else if (isEquipped) {
                actionBtn = `<button onclick="toggleEquip('${item.id}', '${item.type}')" class="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs w-full font-bold border-2 border-white shadow transition-colors">לבוש ✅</button>`;
            } else {
                actionBtn = `<button onclick="toggleEquip('${item.id}', '${item.type}')" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs w-full font-bold shadow transition-colors">הלבש 👕</button>`;
            }
        }

        const iconColor = item.id.includes('pink') ? 'style="color: #f472b6;"' : (item.id.includes('blue') ? 'style="color: #38bdf8;"' : '');

        div.innerHTML = `
            <div class="text-3xl mb-1" ${iconColor}>${item.icon}</div>
            <div class="font-bold text-white text-sm mb-0.5">${item.name}</div>
            <div class="text-gray-400 text-[11px] mb-2">${item.desc}</div>
            <div class="w-full mt-auto">${actionBtn}</div>
        `;
        list.appendChild(div);
    });
}

function buyItem(itemId, cost) {
    if (score < cost) {
        playSound('error');
        alert("אין מספיק מטבעות! צא לקרבות והשג עוד גביעים 🏆");
        return;
    }

    if (itemId === 'pizza' || itemId === 'potion_max') {
        if (playerHP >= 100) {
            alert("מד החיים שלך כבר מלא (100 HP)!");
            return;
        }
        updateScore(-cost);
        playSound('buy');
        if (itemId === 'pizza') {
            playerHP = Math.min(100, playerHP + 50);
        } else {
            playerHP = 100;
        }
        document.getElementById('player-hp-bar').style.width = playerHP + '%';
        ProfileManager.saveData();
        showFloatingText(window.innerWidth * 0.5, window.innerHeight * 0.4, `+${itemId === 'pizza' ? 50 : 100} HP! ❤️`, "#22c55e");
        renderShopItems();
        return;
    }

    if (unlockedItems.includes(itemId)) return;

    updateScore(-cost);
    playSound('buy');
    unlockedItems.push(itemId);

    // Auto-equip the newly purchased item
    const itemMeta = SHOP_ITEMS.find(i => i.id === itemId);
    if (itemMeta) {
        equippedItems[itemMeta.type] = itemId;
    }

    ProfileManager.saveData();
    applyCustomizations();
    renderShopItems();
}

function toggleEquip(itemId, type) {
    if (equippedItems[type] === itemId) {
        equippedItems[type] = null;
    } else {
        equippedItems[type] = itemId;
    }
    ProfileManager.saveData();
    applyCustomizations();
    renderShopItems();
}

function resetVisuals() {
    const root = document.documentElement;
    root.style.removeProperty('--beard-color-start');
    root.style.removeProperty('--beard-color-end');
    root.style.removeProperty('--axe-blade-start');
    root.style.removeProperty('--axe-blade-end');

    document.getElementById('grimble-hat')?.classList.add('hidden');
    document.getElementById('grimble-crown')?.classList.add('hidden');
    document.getElementById('grimble-glasses')?.classList.add('hidden');

    damageMultiplier = 1;
    damageReduction = 0;
    extraTime = 0;
}

function applyItemEffect(item) {
    const root = document.documentElement;
    if (item === 'beard_pink') {
        root.style.setProperty('--beard-color-start', '#f8bbd0');
        root.style.setProperty('--beard-color-end', '#ec407a');
    } else if (item === 'beard_blue') {
        root.style.setProperty('--beard-color-start', '#b3e5fc');
        root.style.setProperty('--beard-color-end', '#03a9f4');
    } else if (item === 'axe_gold') {
        root.style.setProperty('--axe-blade-start', '#ffecb3');
        root.style.setProperty('--axe-blade-end', '#ffb300');
        damageMultiplier = 2;
    } else if (item === 'axe_diamond') {
        root.style.setProperty('--axe-blade-start', '#84ffff');
        root.style.setProperty('--axe-blade-end', '#00e5ff');
        damageMultiplier = 3;
    } else if (item === 'shield_wood') {
        damageReduction = 10;
    } else if (item === 'shield_iron') {
        damageReduction = 20;
    } else if (item === 'hat_top') {
        document.getElementById('grimble-hat')?.classList.remove('hidden');
    } else if (item === 'crown') {
        document.getElementById('grimble-crown')?.classList.remove('hidden');
    } else if (item === 'sunglasses') {
        document.getElementById('grimble-glasses')?.classList.remove('hidden');
    } else if (item === 'stopwatch') {
        extraTime = 1500;
    }
}

function applyCustomizations() {
    resetVisuals();
    Object.values(equippedItems).forEach(itemId => {
        if (itemId) applyItemEffect(itemId);
    });
}

// --- WORD EDITOR ---
function toggleWordEditor() {
    const el = document.getElementById('word-editor-overlay');
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        renderWordEditorList();
    } else {
        el.classList.add('hidden');
        document.getElementById('editor-msg').innerText = "";
    }
}

function removeCustomWord(index) {
    ProfileManager.removeWord(index);
}

function renderWordEditorList() {
    const list = document.getElementById('word-editor-list');
    if (!list) return;
    list.innerHTML = '';
    GAME_WORDS.forEach((word, index) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-gray-800 p-2.5 rounded-lg border border-gray-700";
        div.innerHTML = `
            <div class="flex flex-col">
                <span class="text-white font-bold text-sm">${word.he}</span>
                <span class="text-xs text-blue-300 font-mono tracking-wider">${word.en}</span>
            </div>
            <button onclick="removeCustomWord(${index})" class="text-red-400 hover:text-red-300 font-bold px-2 py-1 transition-colors">🗑️</button>
        `;
        list.appendChild(div);
    });
}

function addNewWord() {
    const heInput = document.getElementById('input-he');
    const enInput = document.getElementById('input-en');
    const msg = document.getElementById('editor-msg');

    const he = heInput.value.trim();
    const en = enInput.value.trim().toUpperCase();

    if (!he || !en) {
        msg.innerText = "❌ נא למלא את שני השדות";
        msg.className = "text-center text-sm font-bold min-h-[20px] text-red-400";
        return;
    }
    // Allow letters, spaces, apostrophes and hyphens for compound words
    if (!/^[A-Z\s'-]+$/.test(en)) {
        msg.innerText = "❌ אנגלית באותיות, רווחים או מקפים בלבד";
        msg.className = "text-center text-sm font-bold min-h-[20px] text-red-400";
        return;
    }

    ProfileManager.addWord(he, en);
    heInput.value = '';
    enInput.value = '';
    msg.innerText = "✅ המילה נוספה בהצלחה למאגר!";
    msg.className = "text-center text-sm font-bold min-h-[20px] text-green-400";
    setTimeout(() => { if (msg) msg.innerText = ""; }, 2500);
}

// --- STUDIO MODE ---
function toggleStudio() {
    const overlay = document.getElementById('studio-overlay');
    const stage = document.getElementById('game-stage');
    const mainMenu = document.getElementById('main-menu-ui');

    if (state !== GameState.STUDIO) {
        lastState = state;
        state = GameState.STUDIO;
        overlay.classList.remove('hidden');
        mainMenu.classList.add('hidden');
        stage.classList.remove('game-mode', 'anim-idle', 'anim-run', 'anim-attack');
        stage.classList.add('studio-mode');
        enableStudioDragging();
    } else {
        state = lastState;
        overlay.classList.add('hidden');
        if (state === GameState.LOBBY) mainMenu.classList.remove('hidden');
        stage.classList.remove('studio-mode');
        stage.classList.add('game-mode', 'anim-idle');
        disableStudioDragging();
        studioShowEnemy('none');
    }
}

function studioShowEnemy(type) {
    const container = document.getElementById('enemy-container');
    const baron = document.getElementById('baron-svg');
    const goblin = document.getElementById('goblin-svg');
    const skeleton = document.getElementById('skeleton-svg');
    const grimble = document.getElementById('grimble-wrapper');

    if (type === 'none') {
        grimble.classList.remove('hidden');
        container.classList.add('translate-x-full');
        return;
    }

    grimble.classList.add('hidden');
    container.classList.remove('translate-x-full');

    if (baron) baron.classList.add('hidden');
    if (goblin) goblin.classList.add('hidden');
    if (skeleton) skeleton.classList.add('hidden');

    if (type === 'baron' && baron) baron.classList.remove('hidden');
    else if (type === 'goblin' && goblin) goblin.classList.remove('hidden');
    else if (type === 'skeleton' && skeleton) skeleton.classList.remove('hidden');
}

function saveStudio() {
    const root = document.getComputedStyle(document.documentElement);
    const vars = [
        '--torso-x', '--torso-y', '--head-x', '--head-y', '--arm-r-x', '--arm-r-y', '--arm-l-x', '--arm-l-y',
        '--baron-body-x', '--baron-body-y', '--baron-head-x', '--baron-head-y', '--baron-hand-l-x', '--baron-hand-l-y', '--baron-hand-r-x', '--baron-hand-r-y',
        '--goblin-body-x', '--goblin-body-y', '--goblin-head-x', '--goblin-head-y', '--goblin-arm-l-x', '--goblin-arm-l-y', '--goblin-arm-r-x', '--goblin-arm-r-y',
        '--skel-body-x', '--skel-body-y', '--skel-head-x', '--skel-head-y', '--skel-arm-r-x', '--skel-arm-r-y'
    ];
    let cssOutput = ":root {\n";
    vars.forEach(v => {
        let val = root.getPropertyValue(v).trim() || '0px';
        cssOutput += `    ${v}: ${val};\n`;
    });
    cssOutput += "}";
    console.log("%c STUDIO SAVE:", "color: lime; font-size: 14px;", cssOutput);
    alert("הגדרות נשמרו לקונסול! (F12)");
    toggleStudio();
}

let studioSelectedElement = null;
let studioOffset = { startX: 0, startY: 0, initialX: 0, initialY: 0 };

function enableStudioDragging() {
    window.addEventListener('mousedown', startRigDrag);
    window.addEventListener('touchstart', startRigDrag, { passive: false });
    window.addEventListener('mousemove', moveRigDrag);
    window.addEventListener('touchmove', moveRigDrag, { passive: false });
    window.addEventListener('mouseup', endRigDrag);
    window.addEventListener('touchend', endRigDrag);
}

function disableStudioDragging() {
    window.removeEventListener('mousedown', startRigDrag);
    window.removeEventListener('touchstart', startRigDrag);
    window.removeEventListener('mousemove', moveRigDrag);
    window.removeEventListener('touchmove', moveRigDrag);
    window.removeEventListener('mouseup', endRigDrag);
    window.removeEventListener('touchend', endRigDrag);
    if (studioSelectedElement) studioSelectedElement.classList.remove('selected');
    studioSelectedElement = null;
}

function startRigDrag(evt) {
    if (state !== GameState.STUDIO) return;
    const target = evt.target.closest('.draggable');
    if (target) {
        evt.preventDefault();
        studioSelectedElement = target;
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        studioSelectedElement.classList.add('selected');

        let clientX = evt.clientX || (evt.touches && evt.touches[0] ? evt.touches[0].clientX : 0);
        let clientY = evt.clientY || (evt.touches && evt.touches[0] ? evt.touches[0].clientY : 0);
        studioOffset.startX = clientX;
        studioOffset.startY = clientY;

        const style = getComputedStyle(document.documentElement);
        const varPrefix = getVarPrefix(target.id);
        studioOffset.initialX = parseInt(style.getPropertyValue(`--${varPrefix}-x`)) || 0;
        studioOffset.initialY = parseInt(style.getPropertyValue(`--${varPrefix}-y`)) || 0;
    }
}

function getVarPrefix(id) {
    if (id === 'rig-torso') return 'torso';
    if (id === 'rig-head') return 'head';
    if (id === 'rig-arm-right') return 'arm-r';
    if (id === 'rig-arm-left') return 'arm-l';
    return id;
}

function moveRigDrag(evt) {
    if (!studioSelectedElement || state !== GameState.STUDIO) return;
    evt.preventDefault();
    let clientX = evt.clientX || (evt.touches && evt.touches[0] ? evt.touches[0].clientX : 0);
    let clientY = evt.clientY || (evt.touches && evt.touches[0] ? evt.touches[0].clientY : 0);
    const deltaX = clientX - studioOffset.startX;
    const deltaY = clientY - studioOffset.startY;

    const varPrefix = getVarPrefix(studioSelectedElement.id);
    document.documentElement.style.setProperty(`--${varPrefix}-x`, (studioOffset.initialX + deltaX) + 'px');
    document.documentElement.style.setProperty(`--${varPrefix}-y`, (studioOffset.initialY + deltaY) + 'px');
}

function endRigDrag() {
    if (studioSelectedElement) {
        studioSelectedElement.classList.remove('selected');
        studioSelectedElement = null;
    }
}

// --- ARMORY (WORD TRAINING) PHASE ---
function startArmoryPhase() {
    initAudio();
    isTurnResolving = false;
    isArmoryTransitioning = false;

    document.getElementById('main-menu-ui').classList.add('hidden');
    document.getElementById('lobby-controls').classList.add('hidden');
    document.getElementById('game-controls').classList.remove('hidden');

    state = GameState.ARMORY;
    document.getElementById('phase-text').innerText = "ARMORY";

    // Ensure enemies are tucked away and Grimble is in center
    document.getElementById('grimble-wrapper').classList.remove('battle-position');
    const enemyContainer = document.getElementById('enemy-container');
    enemyContainer.classList.add('translate-x-full');
    enemyContainer.classList.remove('enemy-defeat');

    const armory = document.getElementById('armory-ui');
    armory.classList.remove('opacity-0', 'pointer-events-none');

    document.getElementById('game-stage').className = "flex-1 w-full h-full relative flex items-center justify-center game-mode anim-idle overflow-hidden";

    // Prepare armory queue
    let pool = [...GAME_WORDS].sort(() => Math.random() - 0.5);
    armoryQueue = pool.slice(0, Math.min(pool.length, ARMORY_BATCH_SIZE));
    currentWordIndex = 0;

    loadArmoryWord();
}

function loadArmoryWord() {
    if (currentWordIndex >= armoryQueue.length) {
        startBattlePhase();
        return;
    }
    const wordData = armoryQueue[currentWordIndex];
    document.getElementById('target-word-he').innerText = wordData.he;

    const bank = document.getElementById('word-bank');
    bank.innerHTML = '';
    bank.classList.remove('translate-y-full', 'hidden');

    // Pick 2 clean decoys without duplicates
    let pool = GAME_WORDS.filter(w => w.en !== wordData.en).map(w => w.en);
    pool = [...new Set(pool)].sort(() => Math.random() - 0.5);
    let decoys = pool.slice(0, 2);
    if (decoys.length < 2) decoys = ["SHIELD", "SWORD"];

    let options = [wordData.en, ...decoys].sort(() => Math.random() - 0.5);

    options.forEach(txt => {
        const el = document.createElement('div');
        el.className = 'chip-draggable px-5 py-3.5 rounded-xl text-white font-bold text-lg select-none';
        el.innerText = txt;

        // Mouse drag
        el.onmousedown = (e) => startGameDrag(e, el);

        // Touch drag
        el.ontouchstart = (e) => {
            if (e.cancelable) e.preventDefault();
            startGameDrag(e.touches[0], el);
        };

        // Quick Tap to equip as friendly fallback
        el.onclick = () => handleChipQuickEquip(txt, el);

        bank.appendChild(el);
    });
}

function handleChipQuickEquip(txt, el) {
    if (isArmoryTransitioning || state !== GameState.ARMORY) return;
    const targetText = armoryQueue[currentWordIndex]?.en.trim().toUpperCase();

    if (txt === targetText) {
        onArmoryWordSuccess(el);
    } else {
        playSound('error');
        el.classList.add('flash-red');
        setTimeout(() => el.classList.remove('flash-red'), 300);
    }
}

let gameDragEl = null;

function startGameDrag(e, el) {
    if (state !== GameState.ARMORY || isArmoryTransitioning) return;
    playSound('grab');
    gameDragEl = el;

    const rect = el.getBoundingClientRect();
    el.style.position = 'fixed';
    el.style.zIndex = '1000';
    el.style.left = rect.left + 'px';
    el.style.top = rect.top + 'px';
    el.style.width = rect.width + 'px';

    speak(el.innerText);

    const move = (ev) => {
        const clientX = ev.clientX !== undefined ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0);
        const clientY = ev.clientY !== undefined ? ev.clientY : (ev.touches && ev.touches[0] ? ev.touches[0].clientY : 0);
        updateGameDrag(clientX, clientY);
    };

    const end = (ev) => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', end);
        window.removeEventListener('touchmove', move);
        window.removeEventListener('touchend', end);

        const clientX = ev.clientX !== undefined ? ev.clientX : (ev.changedTouches && ev.changedTouches[0] ? ev.changedTouches[0].clientX : 0);
        const clientY = ev.clientY !== undefined ? ev.clientY : (ev.changedTouches && ev.changedTouches[0] ? ev.changedTouches[0].clientY : 0);
        checkGameDrop(clientX, clientY);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
}

function updateGameDrag(x, y) {
    if (gameDragEl) {
        gameDragEl.style.left = (x - 60) + 'px';
        gameDragEl.style.top = (y - 30) + 'px';
    }
}

function checkGameDrop(x, y) {
    if (!gameDragEl) return;
    const dropZone = document.getElementById('drop-zone-highlight');
    const zoneRect = dropZone.getBoundingClientRect();

    // Tolerant hitbox around the glowing gauntlet
    const pad = 35;
    const inZone = (
        x >= (zoneRect.left - pad) &&
        x <= (zoneRect.right + pad) &&
        y >= (zoneRect.top - pad) &&
        y <= (zoneRect.bottom + pad)
    );

    const draggedText = gameDragEl.innerText.trim().toUpperCase();
    const targetText = armoryQueue[currentWordIndex]?.en.trim().toUpperCase();

    if (inZone && draggedText === targetText) {
        onArmoryWordSuccess(gameDragEl);
    } else {
        if (inZone && draggedText !== targetText) {
            playSound('error');
        }
        // Reset element styles back to word bank
        gameDragEl.style.position = '';
        gameDragEl.style.left = '';
        gameDragEl.style.top = '';
        gameDragEl.style.width = '';
        gameDragEl.style.zIndex = '';
    }
    gameDragEl = null;
}

function onArmoryWordSuccess(element) {
    if (isArmoryTransitioning) return;
    isArmoryTransitioning = true;

    playSound('success');
    updateScore(5);
    showFloatingText(window.innerWidth * 0.5, window.innerHeight * 0.35, "+5 🏆", "#4ade80");

    element.remove();

    const glow = document.querySelector('.gauntlet-glow');
    if (glow) glow.style.fill = 'white';

    const body = document.getElementById('main-body');
    body.classList.add('flash-effect');
    setTimeout(() => body.classList.remove('flash-effect'), 200);

    currentWordIndex++;

    setTimeout(() => {
        if (glow) glow.style.fill = '#00e5ff';
        isArmoryTransitioning = false;
        loadArmoryWord();
    }, 700);
}

// --- BATTLE PHASE ---
function startBattlePhase() {
    state = GameState.BATTLE;
    isTurnResolving = false;
    document.getElementById('phase-text').innerText = "BATTLE!";

    // Hide Armory
    const armory = document.getElementById('armory-ui');
    armory.classList.add('opacity-0', 'pointer-events-none');

    const bank = document.getElementById('word-bank');
    bank.innerHTML = '';
    bank.classList.add('translate-y-full', 'hidden');

    // Show Battle UI
    const battleUI = document.getElementById('battle-ui');
    battleUI.classList.remove('opacity-0', 'pointer-events-none', 'scale-90');

    // Slide Grimble left and bring Enemy in!
    document.getElementById('grimble-wrapper').classList.add('battle-position');
    const enemyContainer = document.getElementById('enemy-container');
    enemyContainer.classList.remove('translate-x-full');
    enemyContainer.classList.remove('enemy-defeat');

    // Set HP
    enemyHP = maxEnemyHP;
    document.getElementById('enemy-hp-bar').style.width = '100%';
    document.getElementById('player-hp-bar').style.width = Math.max(0, playerHP) + '%';

    // Prepare battle queue
    if (armoryQueue && armoryQueue.length > 0) {
        battleQueue = [...armoryQueue];
    } else {
        let pool = [...GAME_WORDS].sort(() => Math.random() - 0.5);
        battleQueue = pool.slice(0, BATTLE_BATCH_SIZE);
    }
    battleQueue.sort(() => Math.random() - 0.5);

    setTimeout(() => {
        if (state === GameState.BATTLE) {
            startBattleTurn();
        }
    }, 700);
}

function startBattleTurn() {
    if (state !== GameState.BATTLE || enemyHP <= 0 || playerHP <= 0) return;
    isTurnResolving = false;

    const word = battleQueue[Math.floor(Math.random() * battleQueue.length)];

    const questionUI = document.getElementById('battle-question-ui');
    document.getElementById('battle-question-text').innerText = word.he;
    questionUI.classList.remove('-translate-y-20', 'opacity-0');

    const battleOptions = document.getElementById('battle-options');
    battleOptions.innerHTML = '';
    battleOptions.classList.remove('translate-y-full', 'hidden');

    startTimer();

    // Generate decoys
    let pool = GAME_WORDS.filter(w => w.en !== word.en).map(w => w.en);
    pool = [...new Set(pool)].sort(() => Math.random() - 0.5);
    let decoys = pool.slice(0, 2);
    if (decoys.length < 2) decoys = ["ARMOR", "VICTORY"];

    let opts = [word.en, ...decoys].sort(() => Math.random() - 0.5);

    opts.forEach(txt => {
        const btn = document.createElement('button');
        btn.className = "bg-blue-600 hover:bg-blue-500 border-b-4 border-blue-800 text-white font-bold py-3 px-2 rounded-xl active:border-b-0 active:translate-y-1 text-sm md:text-base shadow-lg flex-1 truncate transition-all";
        btn.innerText = txt;

        btn.onclick = () => {
            if (isTurnResolving) return;

            if (txt === word.en) {
                isTurnResolving = true;
                clearInterval(battleTimer);
                btn.style.backgroundColor = '#22c55e';
                btn.style.borderColor = '#15803d';

                const elapsed = Date.now() - startTime;
                const bonus = Math.max(0, Math.floor((TIME_LIMIT - elapsed) / 250));
                const totalScore = 15 + bonus;
                updateScore(totalScore);
                showFloatingText(window.innerWidth * 0.5, window.innerHeight * 0.25, "+" + totalScore + " 🏆", "#4ade80");

                const stage = document.getElementById('game-stage');
                playSound('attack');
                stage.classList.add('anim-attack');

                setTimeout(() => {
                    document.getElementById('main-body').classList.add('shake-screen', 'flash-effect');
                    const dmg = 34 * damageMultiplier;
                    enemyHP = Math.max(0, enemyHP - dmg);
                    showFloatingText(window.innerWidth * 0.65, window.innerHeight * 0.35, "-" + dmg, "#ffeb3b");
                    
                    // FIXED: Using maxEnemyHP instead of non-existent MAX_ENEMY_HP!
                    document.getElementById('enemy-hp-bar').style.width = Math.max(0, (enemyHP / maxEnemyHP * 100)) + '%';
                }, 200);

                setTimeout(() => {
                    stage.classList.remove('anim-attack');
                    document.getElementById('main-body').classList.remove('shake-screen', 'flash-effect');

                    if (enemyHP <= 0) {
                        const enemyContainer = document.getElementById('enemy-container');
                        enemyContainer.classList.add('enemy-defeat');
                        setTimeout(showVictoryScreen, 700);
                    } else {
                        startBattleTurn();
                    }
                }, 600);
            } else {
                playSound('error');
                btn.style.backgroundColor = '#ef4444';
                btn.style.borderColor = '#991b1b';

                // Penalty of 1 second
                startTime -= 1000;
                showFloatingText(window.innerWidth * 0.5, window.innerHeight * 0.3, "-1 שניה ⏱️", "#ef4444");

                const elapsed = Date.now() - startTime;
                if (elapsed >= TIME_LIMIT) {
                    isTurnResolving = true;
                    clearInterval(battleTimer);
                    enemyAttack();
                }
            }
        };
        battleOptions.appendChild(btn);
    });
}

function startTimer() {
    startTime = Date.now();
    const baseTime = 5000;
    const levelMod = (currentLevel - 1) * 200;
    TIME_LIMIT = Math.max(2000, baseTime - levelMod + extraTime);

    const bar = document.getElementById('timer-bar');
    bar.style.width = '0%';
    if (battleTimer) clearInterval(battleTimer);

    battleTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, (elapsed / TIME_LIMIT) * 100);
        bar.style.width = pct + '%';
        if (elapsed >= TIME_LIMIT) {
            clearInterval(battleTimer);
            if (!isTurnResolving) {
                isTurnResolving = true;
                enemyAttack();
            }
        }
    }, 40);
}

function enemyAttack() {
    playSound('hit');
    const enemy = document.querySelector('.enemy:not(.hidden)');
    if (enemy) enemy.classList.add('anim-enemy-attack');

    setTimeout(() => {
        const stage = document.getElementById('game-stage');
        stage.classList.add('anim-hit');
        document.getElementById('main-body').classList.add('flash-red', 'shake-screen');

        const baseDmg = 20;
        const dmg = Math.max(5, baseDmg - damageReduction);
        playerHP = Math.max(0, playerHP - dmg);
        ProfileManager.saveData();

        showFloatingText(window.innerWidth * 0.35, window.innerHeight * 0.4, "-" + dmg, "#ef5350");
        document.getElementById('player-hp-bar').style.width = playerHP + '%';
    }, 250);

    setTimeout(() => {
        if (enemy) enemy.classList.remove('anim-enemy-attack');
        const stage = document.getElementById('game-stage');
        stage.classList.remove('anim-hit');
        document.getElementById('main-body').classList.remove('flash-red', 'shake-screen');

        if (playerHP <= 0) {
            showLoseScreen();
        } else {
            startBattleTurn();
        }
    }, 550);
}

function showVictoryScreen() {
    playSound('victory');
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

    // Bonus heal for victory
    playerHP = Math.min(100, playerHP + 30);
    ProfileManager.saveData();

    document.getElementById('final-score').innerText = score;
    document.getElementById('victory-screen').classList.remove('hidden');

    document.getElementById('battle-question-ui').classList.add('opacity-0');
    document.getElementById('battle-options').classList.add('hidden');
    document.getElementById('battle-ui').classList.add('opacity-0', 'pointer-events-none');
}

function nextLevel() {
    currentLevel++;
    maxEnemyHP = Math.floor(MAX_ENEMY_HP_BASE * Math.pow(1.2, currentLevel - 1));
    changeLevelBackground();
    ProfileManager.saveData();

    document.getElementById('level-display').innerText = currentLevel;
    document.getElementById('victory-screen').classList.add('hidden');

    const enemyContainer = document.getElementById('enemy-container');
    enemyContainer.classList.remove('enemy-defeat');

    startArmoryPhase();
}

function retryLevel() {
    playerHP = 100;
    enemyHP = maxEnemyHP;
    document.getElementById('player-hp-bar').style.width = '100%';
    document.getElementById('enemy-hp-bar').style.width = '100%';

    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('lose-screen').classList.add('hidden');

    const enemyContainer = document.getElementById('enemy-container');
    enemyContainer.classList.remove('enemy-defeat');

    startArmoryPhase();
}

function showLoseScreen() {
    document.getElementById('battle-question-ui').classList.add('opacity-0');
    document.getElementById('word-bank').classList.add('hidden');
    document.getElementById('battle-options').classList.add('hidden');
    document.getElementById('battle-ui').classList.add('opacity-0');

    document.getElementById('lose-screen').classList.remove('hidden');
    document.getElementById('game-controls').classList.add('hidden');
    state = GameState.LOBBY;
}

function returnToMenu() {
    if (battleTimer) clearInterval(battleTimer);
    isTurnResolving = false;
    isArmoryTransitioning = false;
    state = GameState.LOBBY;

    document.getElementById('game-controls').classList.add('hidden');
    document.getElementById('lobby-controls').classList.remove('hidden');
    document.getElementById('main-menu-ui').classList.remove('hidden');

    document.getElementById('armory-ui').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('battle-ui').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('battle-question-ui').classList.add('opacity-0');
    document.getElementById('battle-options').classList.add('hidden');
    document.getElementById('word-bank').classList.add('translate-y-full', 'hidden');

    // Return characters to lobby position
    document.getElementById('grimble-wrapper').classList.remove('battle-position');
    const enemyContainer = document.getElementById('enemy-container');
    enemyContainer.classList.add('translate-x-full');
    enemyContainer.classList.remove('enemy-defeat');

    document.getElementById('game-stage').className = "flex-1 w-full h-full relative flex items-center justify-center game-mode anim-idle overflow-hidden";
    document.getElementById('phase-text').innerText = "LOBBY";

    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('lose-screen').classList.add('hidden');
    document.getElementById('shop-overlay').classList.add('hidden');
    document.getElementById('word-editor-overlay').classList.add('hidden');
    document.getElementById('studio-overlay').classList.add('hidden');
}

function changeLevelBackground() {
    const body = document.getElementById('main-body');
    BG_COLORS.forEach(c => body.classList.remove(c));
    const colorIndex = (currentLevel - 1) % BG_COLORS.length;
    body.classList.add(BG_COLORS[colorIndex]);

    const baron = document.getElementById('baron-svg');
    const goblin = document.getElementById('goblin-svg');
    const skeleton = document.getElementById('skeleton-svg');
    const enemyNameLabel = document.getElementById('enemy-name');

    if (baron) baron.classList.add('hidden');
    if (goblin) goblin.classList.add('hidden');
    if (skeleton) skeleton.classList.add('hidden');

    let activeEnemy = baron;
    let enemyTitle = "הברון פון קלין";

    if (currentLevel >= 7) {
        if (skeleton) activeEnemy = skeleton;
        enemyTitle = "אביר השלד (SKELETON)";
    } else if (currentLevel >= 4) {
        if (goblin) activeEnemy = goblin;
        enemyTitle = "גובלין היער (GOBLIN)";
    } else {
        if (baron) activeEnemy = baron;
        enemyTitle = "הברון פון קלין (BARON)";
    }

    if (activeEnemy) activeEnemy.classList.remove('hidden');
    if (enemyNameLabel) enemyNameLabel.innerText = enemyTitle;
}

function showFloatingText(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.left = (x - 40) + 'px';
    el.style.top = y + 'px';
    if (color) el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
}

// Initial Kickoff
ProfileManager.init();
