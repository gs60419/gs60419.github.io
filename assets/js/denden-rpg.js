const axes = {
  A: ["blank", "空白"],
  B: ["chaos", "混亂"],
  C: ["pressure", "壓爆"],
};

const adjustAxes = {
  A: ["blank", "空白"],
  B: ["control", "控制"],
  C: ["stable", "安定"],
};

const indexByGrid = {
  "blank-blank": 0,
  "blank-control": 1,
  "blank-stable": 2,
  "chaos-blank": 3,
  "chaos-control": 4,
  "chaos-stable": 5,
  "pressure-blank": 6,
  "pressure-control": 7,
  "pressure-stable": 8,
};

const gear = {
  hat: [
    ["H01", "白布帽", "Blank Hood", "小時候比較像自己摸索，沒有太多明確方向。", "先不用急著找答案，慢慢把自己的地圖畫出來。"],
    ["H02", "薄影帽", "Ghost Cap", "你可能很早就學會安靜、乖一點、不要造成麻煩。", "練習讓自己被看見，不只是不要打擾別人。"],
    ["H03", "柔毛帽", "Soft Fur Cap", "你的早期環境相對穩，讓你比較容易溫和地看世界。", "保有溫柔，也替自己補一點危險辨識。"],
    ["H04", "亂羽頭巾", "Feather Scatter Hood", "你可能很常感覺場面很亂，不知道誰的情緒該誰負責。", "練習分清楚：我有感覺到，不代表我一定要處理。"],
    ["H05", "裂光頭盔", "Cracklight Helm", "你可能很習慣在壓力和混亂裡快速反應。", "不是每個狀況都要你救火，先看是不是自己的任務。"],
    ["H06", "雙光貝雷帽", "Dual-Lantern Beret", "你可能同時感受過混亂和溫暖，所以很會照顧氣氛。", "保留溫柔，但不要把所有人的混亂都背起來。"],
    ["H07", "深海頭罩", "Abyss Hood", "你可能常覺得有壓力，但又不一定說得出來源。", "讓預判能力幫你，而不是讓自己一直站崗。"],
    ["H08", "黑洞兜帽", "Void Hood", "你可能很早就學會把情緒收很深，先保護自己。", "不用急著打開自己，只要知道保護殼不是你的全部。"],
    ["H09", "鐵寧冠", "Steel-Quiet Circlet", "你可能經歷過壓力，也練出很能撐的安定感。", "能撐不代表不用休息，堅強也可以包含放下。"],
  ],
  weapon: [
    ["W01", "白型標尺", "Blade of Averaging", "你通常先看眼前互動，不太一開始就下判斷。", "保持開放，也替自己留一點基本防線。"],
    ["W02", "靜默長針", "Silent Pin", "你很容易注意到對方的沉默、語氣和小變化。", "先確認對方真的說了什麼，再看自己補了什麼。"],
    ["W03", "棉光權杖", "Staff of Soft Regard", "你比較容易相信別人是友善、穩定、可以靠近的。", "溫柔很好，但善意和安全可以分開看。"],
    ["W04", "浮空卡牌", "Deck of Drift", "你會快速想到很多種可能，讀人時腦中像在翻牌。", "先留下三張牌：最可能、最該注意、最能行動。"],
    ["W05", "裂序長弓", "Bow of Fractured Paths", "你會先在遠一點的位置觀察氣氛和風險。", "把預判分成已發生、可能發生、我害怕發生。"],
    ["W06", "水鏡水晶球", "Crystal Sphere of Tides", "你很會感覺別人的情緒起伏，也常想幫忙翻譯。", "你可以看見情緒，但不一定要替所有人處理。"],
    ["W07", "深壓戟", "Abyssal Pike", "你靠近人之前，會先確認對方會不會帶來壓力。", "替危險分等級：陌生不一定等於危險。"],
    ["W08", "袖刃", "Silent Slip", "你很會辨認控制感，也很重視自己的邊界。", "先把邊界說出來，不一定要立刻把自己關起來。"],
    ["W09", "鋼寧短斧", "Still-Steel Hatchet", "你遇到事情常會先穩住現場，默默把責任扛起來。", "練習說出三種求助句，讓自己不用每次都獨扛。"],
  ],
  mount: [
    ["M01", "直覺探索獸", "Pathfinder Lynx", "靠直覺找到下一條路。", "記下直覺命中與亂飄，建立導航校準表。"],
    ["M02", "毛海雲獸", "Burrow-Puff", "慢慢鑽進事情核心。", "替深挖設定出口。"],
    ["M03", "珍珠緩行獸", "Spherical Slowback", "很慢、很穩，適合修復與長工。", "把慢變成節奏，而不是自責。"],
    ["M04", "輕語浮牌", "Echo Floatcards", "用一句話抓住事情的關鍵。", "破題後多補一句溫度。"],
    ["M05", "靈脈長弓獸", "Aeon Bowhart", "對準目標，快狠準地前進。", "衝刺前補一張旁枝地圖。"],
    ["M06", "星頸觀測鹿", "Star-Neck Giraffid", "抬高視角，看見盲點與全局。", "先看全局，再看盲點，最後只選一個修正。"],
    ["M07", "雲繭水母", "Aether-Jelly Cocoon", "從內在模型出發，深層整合世界。", "允許更新完成前不要急著回答。"],
    ["M08", "暗影疾刃", "Shade Daggerling", "短時間爆發、快速切換、當下處理。", "為爆發型任務補上冷卻時間。"],
    ["M09", "沉眠木桶 + 孵化蛋", "Dozing Barrel", "不能騎，但能靠，是回能量模式。", "今天的任務不是前進，是把蛋孵回來。"],
  ],
  energy: [
    ["E01", "清醒型", "Clear", "看得清楚，也還有力氣處理。", "保持節奏，不要因為狀態好就把任務塞滿。"],
    ["E02", "專注型", "Focused", "能量被集中到單一目標上。", "設定中途存檔點，讓專注不是一次燒完。"],
    ["E03", "開放型", "Open", "外界資訊進得來，也還能消化。", "替開放狀態加一道門。"],
    ["E04", "雜訊型", "Noisy", "電量不一定低，但頻道很吵。", "降低輸入量，只留下三件真的需要處理的事。"],
    ["E05", "過載型", "Overloaded", "太多資訊或情緒同時湧入。", "先停輸入，再降任務。"],
    ["E06", "無力型", "Low Power", "不是不想動，是可用能量不足。", "把今天任務改成一滴電版本。"],
    ["E07", "鬧鐘型", "Alarm", "身體或心智一直提醒有事不對。", "確認鬧鐘在叫什麼，再做一個小確認。"],
    ["E08", "自動導航型", "Autopilot", "先靠習慣撐過去，暫時不做深度判斷。", "加一個小小的人工操作點。"],
    ["E09", "沉眠 / 孵化型", "Hatching", "現在不是前進，是把蛋孵回來。", "睡、吃、洗澡，把自己放回身體裡。"],
  ],
};

const questions = {
  hat: [
    ["小時候或很早以前，你比較常有哪種感覺？", ["很多事沒人講清楚，只能自己猜。", "家裡或身邊氣氛常常變來變去。", "常覺得壓力很大，好像不能出錯。"]],
    ["如果你不知道接下來會不會安全，你通常會：", ["先安靜下來，看看大家怎麼反應。", "腦中跑出很多可能狀況。", "身體先緊起來，準備防備。"]],
    ["回想以前，你最熟悉的感覺比較像：", ["有點空，不知道自己該怎麼做。", "很亂，情緒或事情一下子太多。", "很重，需要自己撐住。"]],
    ["遇到不舒服的場面，你比較常：", ["先縮小一點，不知道怎麼辦。", "想弄懂規則，避免突然被打到。", "找一個能讓自己穩住的人或節奏。"]],
    ["你想讓自己安心一點時，常會：", ["盡量低調，不要引起注意。", "觀察現在誰說了算、界線在哪。", "抓住一個固定、有規律的東西。"]],
    ["對你來說，最有安全感的是：", ["可以慢一點，不用馬上反應。", "知道哪些事可以做、哪些事要小心。", "有人或環境是溫和、穩定、可預期的。"]],
  ],
  weapon: [
    ["遇到不熟的人，你第一反應比較像：", ["先看看相處起來怎樣，不急著判斷。", "這個人可能有很多面，要多觀察。", "先保持一點距離，安全比較重要。"]],
    ["對方沒回你、或態度不明時，你比較容易：", ["不知道對方到底在想什麼。", "開始想很多種可能。", "覺得有壓力，好像哪裡不太對。"]],
    ["你平常看人的方式比較像：", ["每個人都要看現場互動才知道。", "人很複雜，不能只用一種說法理解。", "人有時會帶來要求、評價或壓力。"]],
    ["別人情緒起來時，你通常會：", ["先看當下發生什麼，不一定猜得到後面。", "注意誰在掌控氣氛、誰有壓力。", "想找比較穩、比較溫和的回應方式。"]],
    ["你最不喜歡哪種人際狀況？", ["完全讀不懂對方。", "感覺被評價、被控制、被壓住。", "本來好好的關係突然變不穩。"]],
    ["你最希望別人給你的訊號是：", ["真實一點，現在怎麼想就怎麼說。", "講清楚界線、意圖和底線。", "持續、穩定、讓人放心的善意。"]],
  ],
  mount: [
    ["走進一個陌生地方，你通常先注意：", ["氣氛對不對、細節有沒有怪怪的。", "大家彼此怎麼互動、誰跟誰比較近。", "規則、動線、位置、接下來要做什麼。"]],
    ["跟人聊天時，你比較常：", ["注意表情、語氣、停頓這些小變化。", "很快感覺到對方現在心情往哪裡走。", "先在腦中整理好邏輯，再回答。"]],
    ["到新環境時，你最常：", ["先安靜觀察一圈。", "先感覺這裡的人好不好相處。", "先弄清楚流程和規則。"]],
    ["你最容易被哪種狀況卡住？", ["突然很吵，或氣氛變得怪怪的。", "大家不說清楚感受，場面很尷尬。", "流程亂掉、資訊不清楚。"]],
    ["要做決定時，你通常比較相信：", ["心裡那個「哪裡怪怪的」直覺。", "大家的感受和關係氣氛。", "事情本身合不合理、路徑清不清楚。"]],
    ["壓力大的時候，你比較容易：", ["變得很敏感，什麼小地方都注意到。", "一直擔心自己是不是讓人不舒服。", "開始列清單，想把事情拉回可控。"]],
    ["別人比較常怎麼形容你？", ["很敏銳，常注意到別人沒看到的事。", "很體貼，會顧到人的感受。", "很穩，或很會整理事情。"]],
    ["你最舒服的狀態是：", ["環境安靜、安全，不會一直刺激你。", "跟相處自然的人在一起。", "任務清楚，事情都在軌道上。"]],
    ["你的反應方式比較像：", ["先捕捉到東西，再想一下怎麼說。", "先感覺到情緒，再慢半拍行動。", "先想清楚路線，再開始動。"]],
    ["如果用一個生活比喻形容你，你比較像：", ["雷達：很會偵測變化。", "橋：很會連接人和感受。", "導航：很會整理路線。"]],
  ],
  energy: [
    ["今天看事情時，你比較像：", ["看得蠻清楚，知道大概該往哪裡走。", "有點霧，但基本上還能看。", "整個糊掉，今天不適合想太深。"]],
    ["你現在的情緒狀態比較像：", ["還算穩，可以聽人說話，也能慢慢消化。", "有點敏感，小事會刺到，但還撐得住。", "很脆弱，現在不適合談太難的事。"]],
    ["你現在的腦袋比較像：", ["清楚有力，可以做決定、處理資訊。", "有點卡，能想但空間不多。", "不太想運作，只想先停一下。"]],
  ],
};

const tiebreakers = {
  rhythm: {
    label: "再問一題",
    prompt: "做一件需要時間的事時，你比較像？",
    options: [["M02", "鑽進一個主題，越挖越深。"], ["M03", "慢慢來，一步一步做比較舒服。"], ["M08", "短時間衝很快，之後需要休息。"]],
  },
  direction: {
    label: "再問一題",
    prompt: "面對複雜的事，你通常先做什麼？",
    options: [["M06", "先看外面發生什麼，找盲點。"], ["M07", "先在腦中整理成一張圖。"]],
  },
  stamina: {
    label: "再問一題",
    prompt: "你的做事能量比較像？",
    options: [["M05", "可以穩定推進，維持一段時間。"], ["M08", "爆發很快，但之後需要比較久恢復。"]],
  },
};

const state = { hat: null, weapon: null, mount: null, energy: null };
const scoreValues = ["A", "B", "C"];
const displayLabels = ["A", "B", "C"];
const gridOptionOrders = [
  ["A", "B", "C"],
  ["A", "B", "C"],
  ["A", "C", "B"],
  ["B", "C", "A"],
  ["B", "C", "A"],
  ["B", "A", "C"],
];
const mountOptionOrders = [
  ["A", "B", "C"],
  ["B", "C", "A"],
  ["C", "A", "B"],
];
const energyOptionOrders = [
  ["A", "B", "C"],
  ["A", "B", "C"],
  ["C", "A", "B"],
];

const emptySlots = {
  hat: ["尚未領取", "完成第一段後，公會會把你以前留下的感覺習慣交給你。"],
  weapon: ["尚未領取", "完成第二段後，你會看到自己面對他人時常拿起什麼工具。"],
  mount: ["尚未領取", "完成第三段後，你會知道今天比較像騎著什麼往前走。"],
  energy: ["尚未檢查", "完成第四段後，卡片會標出今日體力與回復方向。"],
};

function count(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topKey(scores) {
  return ["A", "B", "C"].sort((a, b) => (scores[b] || 0) - (scores[a] || 0))[0];
}

function resultFromGrid(type, values) {
  if (values.length < questions[type].length) return null;
  const first = topKey(count(values.slice(0, 3)));
  const second = topKey(count(values.slice(3, 6)));
  const key = `${axes[first][0]}-${adjustAxes[second][0]}`;
  return gear[type][indexByGrid[key]];
}

function resultFromEnergy(values) {
  if (values.length < questions.energy.length) return null;
  const pattern = values.join("");
  const map = {
    E01: ["AAA", "AAB", "ABA"],
    E02: ["AAC", "ACA", "BAA"],
    E03: ["ABB", "BAB", "BBA"],
    E04: ["BBB"],
    E05: ["ACC", "CAC", "CCA"],
    E06: ["BCC", "CBC", "CCB"],
    E07: ["ABC", "ACB", "BAC", "BCA"],
    E08: ["CAA", "CAB", "CBA"],
    E09: ["CCC"],
  };
  const code = Object.keys(map).find((key) => map[key].includes(pattern));
  return gear.energy.find((item) => item[0] === code);
}

function resultFromMount(values) {
  if (values.length < questions.mount.length) return null;
  const scores = count(values);
  const v = scores.A || 0;
  const e = scores.B || 0;
  const p = scores.C || 0;
  if (Math.max(v, e, p) <= 3 && Math.min(v, e, p) >= 2) return "direction";
  if (v <= 2 && e <= 2 && p <= 2) return gear.mount[8];
  if (v >= 5 && e <= 3 && p <= 3) return gear.mount[0];
  if (e > v && e > p) return "rhythm";
  if (v >= 4 && p >= 4 && e <= 2) return gear.mount[3];
  if (p > e && p >= v) return "stamina";
  if (v >= 4 && e >= 3 && p >= 3) return "direction";
  return gear.mount[0];
}

function selectedValues(type) {
  return questions[type].map((_, index) => {
    const checked = document.querySelector(`input[name="${type}-${index}"]:checked`);
    return checked ? checked.value : null;
  }).filter(Boolean);
}

function optionEntries(type, index, options) {
  const orders = type === "mount" ? mountOptionOrders : type === "energy" ? energyOptionOrders : gridOptionOrders;
  const order = orders[index % orders.length];
  return order.map((score) => ({
    score,
    text: options[scoreValues.indexOf(score)],
  }));
}

function renderQuestions() {
  Object.entries(questions).forEach(([type, list]) => {
    const host = document.querySelector(`[data-question-list="${type}"]`);
    host.innerHTML = list.map(([prompt, options], index) => `
      <fieldset class="question-card">
        <legend><span>${String(index + 1).padStart(2, "0")}</span>${prompt}</legend>
        <div class="choice-row">
          ${optionEntries(type, index, options).map(({ score, text }, optionIndex) => `
              <label>
                <input type="radio" name="${type}-${index}" value="${score}">
                <strong>${displayLabels[optionIndex]}</strong>
                <span>${text}</span>
              </label>
            `).join("")}
        </div>
      </fieldset>
    `).join("");
  });
}

function renderTiebreaker(kind, selectedCode) {
  const host = document.querySelector("[data-tiebreakers]");
  if (!kind || !tiebreakers[kind]) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const data = tiebreakers[kind];
  host.hidden = false;
  host.innerHTML = `
    <fieldset class="question-card tiebreaker-card">
      <legend><span>+</span>${data.label}：${data.prompt}</legend>
      <div class="choice-row">
        ${data.options.map(([code, text], optionIndex) => `
          <label>
            <input type="radio" name="mount-tiebreaker" value="${code}" ${selectedCode === code ? "checked" : ""}>
            <strong>${displayLabels[optionIndex]}</strong>
            <span>${text}</span>
          </label>
        `).join("")}
      </div>
    </fieldset>
  `;
  host.querySelectorAll("input").forEach((input) => input.addEventListener("change", update));
}

function normalizeResult(result) {
  if (typeof result !== "string") return result;
  const checked = document.querySelector("input[name='mount-tiebreaker']:checked");
  if (!checked) return null;
  return gear.mount.find((item) => item[0] === checked.value);
}

function updateSlot(type, result) {
  const slot = document.querySelector(`[data-card-slot="${type}"]`);
  if (!result) {
    slot.classList.remove("filled");
    slot.querySelector("strong").textContent = emptySlots[type][0];
    slot.querySelector("p").textContent = emptySlots[type][1];
    return;
  }
  slot.classList.add("filled");
  slot.querySelector("strong").textContent = `${result[0]} ${result[1]}`;
  slot.querySelector("p").textContent = `${result[3]} 任務：${result[4]}`;
}

function updateProgress() {
  Object.entries(state).forEach(([type, result]) => {
    const step = document.querySelector(`[data-progress-step="${type}"]`);
    step.classList.toggle("is-complete", Boolean(result));
  });
}

function updateReading() {
  const completed = Object.values(state).filter(Boolean).length;
  document.querySelector("[data-card-status]").textContent = completed === 4 ? "已成卡" : `${completed}/4`;
  const code = ["hat", "weapon", "mount", "energy"].map((type) => state[type]?.[0] || `${type[0].toUpperCase()}__`).join("-");
  document.querySelector("[data-short-code]").textContent = code;
  if (completed < 4) {
    document.querySelector("[data-card-reading]").innerHTML = "<p>先不用急著定義自己。從第一題開始，慢慢把裝備領齊。</p>";
    return;
  }
  document.querySelector("[data-card-reading]").innerHTML = `
    <p>你的今日角色卡代碼是 <strong>${code}</strong>。</p>
    <p>${state.hat[1]} 是以前留下的感覺習慣，${state.weapon[1]} 是你遇到人時常用的工具，${state.mount[1]} 是現在的前進方式，${state.energy[1]} 則提醒你今天適合的速度。</p>
    <p>下一步不用變成別人，只要照著能量條調整任務大小。</p>
  `;
}

function updateAvatar() {
  document.querySelector("[data-avatar-hat]").textContent = state.hat ? state.hat[0] : "";
  document.querySelector("[data-avatar-weapon]").textContent = state.weapon ? state.weapon[0] : "";
  document.querySelector("[data-avatar-mount]").textContent = state.mount ? state.mount[0] : "";
}

function update() {
  state.hat = resultFromGrid("hat", selectedValues("hat"));
  state.weapon = resultFromGrid("weapon", selectedValues("weapon"));
  const mountRaw = resultFromMount(selectedValues("mount"));
  const selectedTiebreaker = document.querySelector("input[name='mount-tiebreaker']:checked")?.value;
  renderTiebreaker(typeof mountRaw === "string" ? mountRaw : null, selectedTiebreaker);
  state.mount = normalizeResult(mountRaw);
  state.energy = resultFromEnergy(selectedValues("energy"));
  Object.entries(state).forEach(([type, result]) => updateSlot(type, result));
  updateProgress();
  updateReading();
  updateAvatar();
}

function reset() {
  document.querySelector("[data-rpg-form]").reset();
  Object.keys(state).forEach((key) => { state[key] = null; });
  document.querySelector("[data-tiebreakers]").hidden = true;
  Object.entries(state).forEach(([type, result]) => updateSlot(type, result));
  updateProgress();
  updateReading();
  updateAvatar();
}

document.addEventListener("DOMContentLoaded", () => {
  renderQuestions();
  document.querySelectorAll("[data-rpg-form] input").forEach((input) => input.addEventListener("change", update));
  document.querySelector("[data-reset]").addEventListener("click", reset);
});
