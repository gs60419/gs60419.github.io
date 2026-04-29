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
    ["H01", "白布帽", "Blank Hood", "沒有明確指引，也沒有明確限制。", "先承認自己有很大的未定義空間。"],
    ["H02", "薄影帽", "Ghost Cap", "存在感低，被要求乖、安靜、不要麻煩。", "把存在感從不打擾改成可以被看見。"],
    ["H03", "柔毛帽", "Soft Fur Cap", "沒有特別刺激，但被穩穩包住。", "保有溫柔，同時辨識真的危險。"],
    ["H04", "亂羽頭巾", "Feather Scatter Hood", "界線混亂、角色不明確。", "分辨我感覺到了和我必須負責。"],
    ["H05", "裂光頭盔", "Cracklight Helm", "被壓制但又混亂、多頭指令。", "把救火能力收回來，不再把每個火警都當主線。"],
    ["H06", "雙光貝雷帽", "Dual-Lantern Beret", "亂中有愛、愛中有亂。", "保留溫柔，但不要把所有混亂都背到自己身上。"],
    ["H07", "深海頭罩", "Abyss Hood", "壓力來源不明，但深深包住。", "讓預判能力服務自己，而不是永遠守夜。"],
    ["H08", "黑洞兜帽", "Void Hood", "被完全壓制過，情緒被吸入黑洞。", "不急著打開自己，但知道黑洞不是自己的全部。"],
    ["H09", "鐵寧冠", "Steel-Quiet Circlet", "被壓過，但後來有安靜恢復。", "讓堅韌不只是承受，也能包含放下。"],
  ],
  weapon: [
    ["W01", "白型標尺", "Blade of Averaging", "用當下反應衡量他人，預設值很低。", "替自己補上最基本的危險辨識刻度。"],
    ["W02", "靜默長針", "Silent Pin", "把他人的沉默與細節讀成評價訊號。", "把感覺被否定拆成可檢查的訊號。"],
    ["W03", "棉光權杖", "Staff of Soft Regard", "預設他人是柔和、穩定、可親近的。", "把善意和安全分開檢查。"],
    ["W04", "浮空卡牌", "Deck of Drift", "從大量可能性中快速抽牌判讀。", "每次只留下三張牌：最可能、最需要注意、最能幫助行動。"],
    ["W05", "裂序長弓", "Bow of Fractured Paths", "遠距離預判情緒風向與風險路徑。", "把預判分成已發生、可能發生、我害怕發生。"],
    ["W06", "水鏡水晶球", "Crystal Sphere of Tides", "讀懂他人情緒微波，替混亂翻譯。", "看見潮汐，不必替海洋負責。"],
    ["W07", "深壓戟", "Abyssal Pike", "在靠近前先探測人群裡的暗流。", "為危險建立等級表。"],
    ["W08", "袖刃", "Silent Slip", "精準切開偽裝，保留不可被控制的邊界。", "讓袖刃先不出鞘，把邊界說出來。"],
    ["W09", "鋼寧短斧", "Still-Steel Hatchet", "安靜承擔、穩定處理，把事情扛住。", "寫下三種求助句型。"],
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
    ["回想早期生活，你最常覺得世界像：", ["沒有人真的說明規則，很多事要自己猜。", "事情常常變來變去，很難預測。", "空氣裡有壓力，好像不能出錯。"]],
    ["當你不確定自己安不安全時，你比較像：", ["先空下來，看大家怎麼反應。", "腦中跑出很多可能版本。", "身體先縮緊，準備承受或防禦。"]],
    ["你最熟悉的童年感覺比較接近：", ["空白、等待、不知道要怎麼填。", "混亂、跳動、情緒或資訊太多。", "沉重、壓迫、需要自己穩住。"]],
    ["面對不舒服的情境，你最常：", ["不確定該怎麼辦，先讓自己變小。", "想掌握規則，避免被突襲。", "找一個能穩住自己的節奏或對象。"]],
    ["當你想讓世界比較可承受，你會：", ["降低存在感。", "觀察誰掌控局面。", "找到穩定的東西抓住。"]],
    ["你最需要的安全感比較像：", ["不被要求立刻反應。", "知道邊界、規則與風險在哪裡。", "有一個溫和、可預期的落點。"]],
  ],
  weapon: [
    ["你遇到陌生人時，通常先覺得：", ["先不要預設，等互動後再說。", "每個人差很多，可能性太多。", "先保持距離，比較安全。"]],
    ["當對方沒有明確回應你時，你比較容易：", ["不太知道他在想什麼。", "想出很多版本。", "感覺有壓力，像是有什麼不對。"]],
    ["你心中的「一般人」比較像：", ["沒有固定形狀，要看現場。", "多變、有分歧，很難只用一種規則讀。", "可能帶著威脅、要求或壓力。"]],
    ["面對他人的情緒，你通常：", ["先看當下，不一定能預測。", "會注意誰在控制場面。", "會尋找穩定、溫和、可預期的反應。"]],
    ["你最怕的人際狀況是：", ["完全讀不懂對方。", "對方在評價、掌控或壓迫你。", "原本穩定的關係突然變得不穩。"]],
    ["你比較想要別人給你的訊號是：", ["現在真實的反應。", "清楚的界線與意圖。", "穩定的善意與持續性。"]],
  ],
  mount: [
    ["當你走進陌生場合時，你先注意到：", ["氣氛、細節、誰看起來怪怪的。", "人與人之間的互動關係。", "動線、規則、座位位置。"]],
    ["對話進行中，你最常：", ["捕捉微妙表情變化。", "很快感覺到對方情緒方向。", "在腦中組織邏輯再回話。"]],
    ["換新環境時，你最常：", ["先默默觀察一圈。", "想知道這裡的人好不好相處。", "想弄清楚規則、動線、流程。"]],
    ["你最受不了的事情是：", ["突然很吵或氣氛變得奇怪。", "氛圍尷尬、別人沒講清楚感受。", "流程亂掉、資訊不清楚。"]],
    ["你做決定時，通常依靠：", ["感覺到哪裡怪怪的那股直覺。", "對方或大家的情緒方向。", "事情本身的邏輯。"]],
    ["當你壓力大時，你比較像：", ["過度敏感，什麼都注意到。", "擔心自己是不是讓別人不舒服。", "開始列清單、想控制事情。"]],
    ["別人最常說你：", ["很敏銳。", "很體貼。", "很穩或很理性。"]],
    ["你最舒服的狀態是：", ["環境讓你覺得安全安靜。", "跟相處自然的人在一起。", "任務明確，事情都在軌道上。"]],
    ["如果形容自己的反應方式：", ["捕捉快，但會想一下。", "情緒同步快，行動慢半拍。", "行動快，但要先想清楚。"]],
    ["你覺得自己最像：", ["雷達。", "連線器。", "小型模擬器。"]],
  ],
  energy: [
    ["今天的你，看事情的鏡頭是：", ["聚焦清楚：大局、小局都看得順。", "普通模糊：能看，但不遠。", "完全糊掉：今天很不適合思考人生。"]],
    ["你此刻最靠近哪種狀態？", ["情緒穩得漂亮，可以聽人講話。", "有點敏感，但還撐得住。", "最好先不要和人類進行高難度互動。"]],
    ["你現在的腦袋比較像：", ["清楚有力：能做決定、能承受資訊量。", "卡住一半：能想，但空間不多。", "完全不想運作：今天只想靜止。"]],
  ],
};

const tiebreakers = {
  rhythm: {
    label: "運作節奏",
    prompt: "你做一件需要時間的事，節奏比較像？",
    options: [["M02", "鑽進一個主題，停不下來。"], ["M03", "慢慢來，享受每一個步驟。"], ["M08", "短時間衝很快，然後需要停下恢復。"]],
  },
  direction: {
    label: "資訊處理方向",
    prompt: "面對複雜的事，你通常先做什麼？",
    options: [["M06", "先往外看，掃描盲點。"], ["M07", "先往內建，在腦海裡整理出一張圖。"]],
  },
  stamina: {
    label: "續航確認",
    prompt: "你的能量模式比較像？",
    options: [["M05", "穩定持續，可以長時間維持在同一件事上。"], ["M08", "爆發型，衝很快，但需要比較長時間恢復。"]],
  },
};

const state = { hat: null, weapon: null, mount: null, energy: null };

const emptySlots = {
  hat: ["尚未領取", "完成第一段後，公會會把你的開局濾鏡交給你。"],
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

function renderQuestions() {
  Object.entries(questions).forEach(([type, list]) => {
    const host = document.querySelector(`[data-question-list="${type}"]`);
    host.innerHTML = list.map(([prompt, options], index) => `
      <fieldset class="question-card">
        <legend><span>${String(index + 1).padStart(2, "0")}</span>${prompt}</legend>
        <div class="choice-row">
          ${options.map((text, optionIndex) => {
            const value = ["A", "B", "C"][optionIndex];
            return `
              <label>
                <input type="radio" name="${type}-${index}" value="${value}">
                <strong>${value}</strong>
                <span>${text}</span>
              </label>
            `;
          }).join("")}
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
        ${data.options.map(([code, text]) => `
          <label>
            <input type="radio" name="mount-tiebreaker" value="${code}" ${selectedCode === code ? "checked" : ""}>
            <strong>${code}</strong>
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
    <p>你的今日 build 是 <strong>${code}</strong>。</p>
    <p>${state.hat[1]} 是開局濾鏡，${state.weapon[1]} 是人際工具，${state.mount[1]} 是現在的行進方式，${state.energy[1]} 則提醒你今天適合的速度。</p>
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
