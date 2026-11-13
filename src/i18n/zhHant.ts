import { formats, type Strings } from './en';

const f = formats('zh-TW');
const secs = (ms: number): string => `${(ms / 1000).toFixed(1)} 秒`;

/**
 * The interface in Traditional Chinese (Taiwan wording), converted from
 * `zhHans` with OpenCC s2twp and then read through by hand. Same shape as `en`; nothing here is
 * written by a model at run time. Names of US offices and forms stay in
 * English, as they appear in the letters.
 */
export const zhHant: Strings = {
  lang: 'zh-Hant',
  format: f,
  appName: 'Letterkind',
  interfaceLanguage: '語言',
  tagline: '貼上、拍照或開啟一封官方信件。信件在本裝置上讀取，不會離開本裝置。',
  notAdvice: 'Letterkind 幫您讀懂信件，不構成法律、稅務或醫療建議。',

  device: {
    checking: '正在檢查此瀏覽器能否在本裝置上讀信…',
    ready: '裝置端模型已就緒。您的信件就在這個瀏覽器裡讀取。',
    downloadable: '此瀏覽器可以在本裝置上讀信，但需要先下載模型（只需一次）。',
    downloading: '正在下載裝置端模型…',
    unavailable: '此裝置無法執行瀏覽器內建模型，因此 Letterkind 不能在這裡讀信。',
    unsupported: '此瀏覽器沒有內建模型。Letterkind 需要較新版本的電腦版 Chrome 才能在本裝置上讀信。',
    download: '下載裝置端模型',
    downloadFailed: '模型準備失敗',
  },

  input: {
    label: '信件',
    placeholder: '把信件的文字貼到這裡。',
    read: '讀這封信',
    again: '讀另一封信',
    samples: '或者試試一封虛構的範例信：',
    sampleNote: '範例信件。寄信方、姓名和號碼都是虛構的。',
    sampleTitles: {
      'medical-bill': '醫院帳單',
      eob: '看起來像帳單的保險說明',
      'tax-proposed': '建議調整稅額的稅務通知',
    },
    add: '開啟照片或 PDF',
    addNote: '照片和 PDF 只在此瀏覽器中開啟，不會上傳。',
    noPictures: '此瀏覽器的裝置端模型看不了圖片，所以這裡讀不了照片或掃描版 PDF。帶文字層的 PDF 仍然可以讀。',
    unsupportedFile: (name: string) => `Letterkind 打不開 ${name}。它能開啟照片（JPEG、PNG、WebP）、PDF 和純文字檔案。`,
    leftOut: (n: number, read: number) =>
      n === 1 ? `最後一頁沒有讀：Letterkind 只讀前 ${read} 頁。` : `最後 ${n} 頁沒有讀：Letterkind 只讀前 ${read} 頁。`,
    fromFile: '這段文字是在本裝置上直接從您的檔案裡取出的，沒有用模型。請先核對，再讀信。',
    fromPicture: (ms: number) =>
      `裝置端模型用 ${Math.round(ms / 1000)} 秒從您的圖片裡抄出了這段文字。請把金額、日期和號碼與原信逐一對照，改正錯誤後再繼續：Letterkind 接下來告訴您的內容，都是對照這段文字核對的，而不是對照圖片。`,
    unreadable: (n: number) =>
      n === 1
        ? '模型把一處標成了 [unreadable]（看不清）。如果這處重要，請照原信補上。'
        : `模型把 ${n} 處標成了 [unreadable]（看不清）。如果這些地方重要，請照原信補上。`,
    pictureOf: (page: number) => `您信件的第 ${page} 頁`,
  },

  progress: {
    classifying: '正在判斷這是哪一類信件…',
    extracting: '正在找出信裡要求您做什麼…',
    opening: '正在開啟檔案…',
    transcribing: (page: number, pages: number) =>
      pages === 1 ? '正在本裝置上抄出圖片中的文字…' : `正在本裝置上抄出第 ${page} 頁（共 ${pages} 頁）…`,
    transcribingNote: '在沒有獨立顯示卡的電腦上，每頁可能要一分鐘以上。文字會邊讀邊顯示，讀完後可以修改。',
    stop: '停止',
  },

  where: {
    onDevice: '在本裝置上',
    seconds: secs,
    line: (n: number) => `第 ${n} 行`,
    lines: (ns: readonly number[]) => `第 ${ns.join('、')} 行`,
  },

  kind: {
    heading: '這是哪一類信件',
    agreed: '裝置端模型和關鍵字檢查都這樣判斷。',
    modelOnly: '裝置端模型這樣判斷，關鍵字檢查沒有給出意見。',
    keywordsOnly: '關鍵字檢查這樣判斷，裝置端模型沒有給出可用的答案。',
    neither: '裝置端模型和關鍵字檢查都沒認出這封信。',
    chosen: '這是您選的。',
    evidence: '關鍵字檢查依據的詞句：',
    choose: '對這封信有兩種不同的判斷',
    chooseBody: 'Letterkind 接下來顯示什麼取決於信件類型，所以它不會亂猜。是哪一種？',
    saidByModel: '裝置端模型',
    saidByKeywords: '關鍵字檢查',
    somethingElse: '其他',
  },

  field: {
    sender: '寄信方',
    reference: '需要引用的編號',
    phone: '聯絡電話',
    notStated: '信裡似乎沒有寫。',
    notInLetter: (claimed: string) => `裝置端模型回答的是「${claimed}」。信裡沒有這個內容，所以不把它當作事實顯示。`,
    inTheLetter: '信裡實際寫的是：',
    noAmount: '這類信件不要求您付錢。',
    noAmountWithheld: '信裡提到了金額，但對這類信件來說，沒有一個是帳單金額，所以不顯示金額。',
    noDeadline: '這類信件沒有給您設定期限。',
    noDeadlineWithheld: '信裡提到了日期，但對這類信件來說，沒有一個是期限，所以不顯示日期。',
  },

  amount: {
    amount_due: '應付金額',
    proposed: '擬議金額（尚未欠款）',
    claimed: '對方聲稱您欠的金額',
    new_rent: '新租金',
    fine: '罰款',
    fee: '費用',
    none: '金額',
  },

  deadline: {
    pay: '付款截止',
    respond: '回覆截止',
    appear: '到場日期',
    dispute: '提出異議截止',
    appeal: '申訴截止',
    enroll: '登記截止',
    renew: '續期截止',
    takes_effect: '生效日期',
    none: '期限',
  },

  days: (n: number) =>
    n === 0 ? '就是今天。' : n === 1 ? '就是明天。' : n > 1 ? `距今天還有 ${n} 天。` : n === -1 ? '已經是昨天了。' : `已經過去 ${-n} 天了。`,

  error: {
    heading: '這封信沒能讀出來',
    retry: '再試一次',
  },

  guidance: {
    heading: '這是什麼意思，該怎麼做',
    intro: 'Letterkind 可以請雲端一個更大的模型，寫一份這類信件的通俗解釋。告訴那個模型的只有下面三件事，別的什麼都沒有：',
    kind: '信件類型',
    state: '所在州',
    stateNotGiven: '未填',
    language: '語言',
    nothingElse:
      '您的信件不會發出去，信裡的姓名、金額、日期和號碼也都不會。解釋回來時帶著空位，這些空位在本裝置上用對照您信件核對過的內容填上。',
    ask: '取得解釋',
    checking: '正在尋找本裝置上已儲存的解釋…',
    asking: '正在請求這類信件的解釋…',
    what: '這是什麼信',
    steps: '該怎麼做',
    ifIgnored: '如果您什麼都不做',
    whoCanHelp: '誰能幫忙',
    legend: '標示出的詞是在本裝置上從您的信件裡填進去的。寫其餘部分的模型從來沒有看到過它們。',
    standInLegend: '斜體字表示您的信裡沒有可以核對的具體內容，暫時用通用說法代替。',
    fromCloud: (model: string, ms: number, bytes: number) =>
      `由雲端的 ${model} 用 ${secs(ms)}寫成。發給它的是 ${f.number(bytes)} 位元組，沒有一個來自您的信件。已儲存在本裝置上，下次直接用。`,
    fromSaved: (day: string) => `自 ${day} 起儲存在本裝置上。這次什麼都沒有傳送。`,
    forget: '清除已儲存的解釋',
    rejectedHeading: '這份解釋已被丟棄',
    rejectedBody: '收到了回答，但它違反了 Letterkind 的一條規則，所以一個字都不顯示。',
    rejected: {
      not_json: () => '它不是要求的格式。',
      wrong_shape: () => '它不是要求的格式。',
      too_long: () => '它超過了允許的長度。',
      unknown_marker: (found: string) => `它留下了一個 Letterkind 不知道怎麼填的空位（「${found}」）。`,
      marker_not_allowed_here: (found: string) => `它為這類信件沒有的資訊留了空位（「${found}」）。`,
      amount: (found: string) => `它自己寫了一個金額（「${found}」）。金額只能來自您的信件。`,
      date: (found: string) => `它自己寫了一個日期（「${found}」）。日期只能來自您的信件。`,
      phone: (found: string) => `它自己寫了一個電話號碼（「${found}」）。電話號碼只能來自您的信件。`,
      web_address: (found: string) => `它包含網址或電子郵件地址（「${found}」）。Letterkind 不顯示模型寫出的地址。`,
      not_in_language: () => '它不是用您所選語言的正常寫法寫的——用了別的文字、寫成了英文，或者漏掉了重音符號。',
      blank_left_in_english: (found: string) => `它的譯文裡有一處讓您填寫的空白還是英文（「${found}」）。`,
      states_the_law: (found: string) =>
        `它寫的信對法律下了斷言（「${found}」）。您簽名的內容沒人能在這裡核實，所以沒有保留。Letterkind 寫的信只提出請求，不替寄信方解釋法律。`,
      translation_differs: (found: string) => `它的譯文和英文對不上：信件資訊的空位（「${found}」）只在其中一份裡出現。`,
    },
    askAgain: '重新請求',
    busyBody:
      '雲端模型連續兩次忙得沒法回答。不是您這邊的問題：過一分鐘再請求。上面 Letterkind 從您信裡讀出的內容是在本裝置上完成的，不受影響。',
    limitBody:
      'Letterkind 每分鐘向雲端模型請求的次數有上限（所有使用者合計），剛剛已經用完。不是您這邊的問題：過一分鐘再請求。上面 Letterkind 從您信裡讀出的內容是在本裝置上完成的，不受影響。',
    unavailableHeading: '沒能取得解釋',
    unavailableBody: '每類信件第一次取得解釋需要連網。上面 Letterkind 從您信裡讀出的內容是在本裝置上完成的，不受影響。',
  },

  terms: {
    inEnglish: (heading: string) =>
      `帶底線的詞收在 Letterkind 的詞彙表裡。點一下可以看它的一般含義。這些釋義是隨 Letterkind 一起提供的固定文字，人人看到的都一樣：點的時候不生成任何內容，也不傳送任何內容。想看其他語言，請在「${heading}」裡選擇。`,
    inSpanish: (heading: string) =>
      `帶底線的詞收在 Letterkind 的詞彙表裡。點一下可以看它的一般含義，用西班牙語（「${heading}」裡選的語言）顯示，旁邊附英文。兩者都是隨 Letterkind 一起提供的固定文字，人人看到的都一樣：點的時候不生成任何內容，也不傳送任何內容。`,
    inCloud: (language: string, heading: string) =>
      `帶底線的詞收在 Letterkind 的詞彙表裡。點一下可以看它的一般含義，用${language}（「${heading}」裡選的語言）顯示。Letterkind 內建的釋義只有英文和西班牙文；要看${language}，點的時候會請雲端模型翻譯一條。告訴它的只有您點的是哪個詞（詞彙表自己的詞條，而不是從您信裡抄的字）和語言，別的什麼都沒有。`,
    heading: (words: string) => `「${words}」是什麼意思`,
    close: '關閉',
    asking: '正在請雲端模型翻譯這條釋義…',
    ask: (language: string) => `翻譯成${language}`,
    english: '英文原文（Letterkind 詞彙表）',
    general: '這是這個詞的一般含義，與您的信件或您的具體情況無關，也不是建議。',
    translated: '譯文由模型翻譯，可能有偏差。以英文原文為準，那是 Letterkind 負責的措辭。',
    fromGlossary: '來自 Letterkind 自帶的詞彙表：隨應用程式提供的固定文字。沒有生成任何內容，也沒有傳送任何內容。',
    fromCloud: (model: string, ms: number, bytes: number) =>
      `由雲端的 ${model} 用 ${secs(ms)}翻譯。發給它的是 ${f.number(bytes)} 位元組：詞彙表的詞條和語言，沒有一個來自您的信件。已儲存在本裝置上，下次直接用。`,
    rejectedHeading: '這份譯文已被丟棄',
    rejectedBody: '收到了譯文，但它違反了 Letterkind 的一條規則，所以一個字都不顯示。',
    unavailableHeading: '沒能取得譯文',
    unavailableBody: '沒有收到回答。翻譯釋義需要連網。下面的英文是 Letterkind 自帶的，不需要連網。',
  },

  reply: {
    heading: '一封可以寄出的回信',
    intro: 'Letterkind 可以請同一個雲端模型寫一份這類信件的回信草稿。告訴它的還是那三件事，別的什麼都沒有：',
    change: '所在州和語言就是上面選的。',
    nothingElse:
      '您的信件不會發出去，您的姓名和您想說的話也不會。草稿回來時，信件資訊的位置留著空位，在本裝置上填好；只有您自己知道的內容，用方括號留空。',
    ask: '起草回信',
    checking: '正在尋找本裝置上已儲存的草稿…',
    asking: '正在請求這類信件的回信草稿…',
    toSend: '要寄出的回信',
    subject: '主題：',
    legend: '標示出的詞是在本裝置上從您的信件裡填進去的。',
    blanks: (n: number) => `有 ${n} 處方括號需要您手動填寫。`,
    copy: '複製回信',
    copied: '已複製',
    copyFailed: '沒能複製回信。請選取文字後手動複製。',
    translatedHeading: (language: string) => `回信內容（${language}）`,
    translatedNote: '這份是給您看的，不要寄出。寄出的是上面那份：給您寫信的機構讀的是英文。',
    beforeSending: '寄出之前',
    draftNote: '這只是草稿，不是法律意見。請逐行讀完，改掉不符合您情況的地方，並保留一份寄出內容的副本。',
    fromCloud: (model: string, ms: number, bytes: number) =>
      `由雲端的 ${model} 用 ${secs(ms)}起草。發給它的是 ${f.number(bytes)} 位元組，沒有一個來自您的信件。已儲存在本裝置上，下次直接用。`,
    rejectedHeading: '這份草稿已被丟棄',
    unavailableHeading: '沒能取得草稿',
    unavailableBody: '每類信件第一次起草回信需要連網。上面 Letterkind 從您信裡讀出的內容是在本裝置上完成的，不受影響。',
  },

  ledger: {
    heading: '離開過本裝置的內容',
    nothing: '沒有任何內容離開過本裝置。',
    sent: (n: number, bytes: number) => `已傳送 ${n} 個請求，共 ${f.number(bytes)} 位元組，沒有一個位元組來自信件。`,
    attempted: (n: number) => `嘗試了 ${n} 個請求，沒有拿到結果。`,
    stayed: (n: number) => `${n} 個請求在本裝置上得到了回答。`,
    underway: (n: number) => `${n} 個請求正在進行。`,
    underwayLabel: '進行中',
    note: '讀信由這個瀏覽器裡的模型完成，不傳送任何內容。這裡逐字列出 Letterkind 向瀏覽器以外的模型發出的每一個請求。',
    appCheck:
      '第一次發出請求時還會發生一件事：本頁會載入 Google reCAPTCHA，讓伺服器確認請求來自本應用程式而不是腳本。Letterkind 不會把您信裡的任何內容交給它。在此之前不會載入。',
    purpose: {
      explain: '某類信件的解釋',
      reply: '回信草稿',
      term: '詞語釋義',
    },
    left: {
      sent: '已傳送',
      attempted: '嘗試傳送',
      stayed: '留在本裝置上',
    },
    ran: {
      cloud: '在雲端回答',
      device: '在本裝置上回答',
      nowhere: '沒有回答',
    },
    term: '詞語',
    bytes: (n: number) => `${f.number(n)} 位元組`,
    words: '實際傳送的原文',
    wordsNote: '這些文字是應用程式裡固定的：任何人選了同樣的信件類型、州和語言，發出的都一模一樣。隨附一份固定的回答格式說明。',
  },

  kinds: {
    tax_balance_due: '稅單（欠稅）',
    tax_proposed_change: '報稅表擬議調整',
    tax_identity_verification: '稅務身份核驗',
    tax_refund_or_information: '退稅或稅務資訊通知',
    medical_bill: '醫療帳單',
    insurance_eob: '保險福利說明（EOB，不是帳單）',
    insurance_denial: '保險拒賠',
    utility_bill: '水電瓦斯帳單',
    utility_shutoff: '停水停電停瓦斯警告',
    debt_collection: '催債信',
    eviction_notice: '驅逐通知',
    rent_increase_or_lease_change: '漲租或租約變更',
    court_summons_or_lawsuit: '法院傳票（您被起訴了）',
    jury_summons: '陪審員傳票',
    traffic_or_parking_ticket: '交通或停車罰單',
    benefits_renewal: '福利續期',
    benefits_denial_or_reduction: '福利被拒、減少或終止',
    immigration_appointment: '移民局預約',
    immigration_request_for_evidence: '移民局補件通知（RFE）',
    school_notice: '學校通知',
    bank_or_credit_notice: '銀行或信用通知',
    data_breach_notice: '資料外洩通知',
    vehicle_registration_or_recall: '車輛註冊或召回',
    other: '其他類型的信件',
  },

  languages: {
    en: '英語',
    es: '西班牙語',
    'zh-Hans': '簡體中文',
    'zh-Hant': '繁體中文',
    vi: '越南語',
    tl: '他加祿語',
    ko: '韓語',
    ar: '阿拉伯語',
    ru: '俄語',
    ht: '海地克里奧爾語',
    pt: '葡萄牙語',
    fr: '法語',
  },
};
