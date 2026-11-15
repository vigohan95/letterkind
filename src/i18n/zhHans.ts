import { formats, type Strings } from './en';

const f = formats('zh-CN');
const secs = (ms: number): string => `${(ms / 1000).toFixed(1)} 秒`;

/**
 * The interface in Simplified Chinese. Same shape as `en`; nothing here is
 * written by a model at run time. Names of US offices and forms stay in
 * English, as they appear in the letters.
 */
export const zhHans: Strings = {
  lang: 'zh-Hans',
  format: f,
  appName: 'Letterkind',
  interfaceLanguage: '语言',
  tagline: '粘贴、拍照或打开一封官方信件。信件在本设备上读取，不会离开本设备。',
  notAdvice: 'Letterkind 帮您读懂信件，不构成法律、税务或医疗建议。',

  device: {
    checking: '正在检查此浏览器能否在本设备上读信…',
    ready: '设备端模型已就绪。您的信件就在这个浏览器里读取。',
    downloadable: '此浏览器可以在本设备上读信，但需要先下载模型（只需一次）。',
    downloading: '正在下载设备端模型…',
    unavailable: '此设备无法运行浏览器内置模型，因此 Letterkind 不能在这里读信。',
    unsupported: '此浏览器没有内置模型。Letterkind 需要较新版本的电脑版 Chrome 才能在本设备上读信。',
    download: '下载设备端模型',
    downloadFailed: '模型准备失败',
  },

  input: {
    label: '信件',
    placeholder: '把信件的文字粘贴到这里。',
    read: '读这封信',
    again: '读另一封信',
    samples: '或者试试一封虚构的示例信：',
    sampleNote: '示例信件。寄信方、姓名和号码都是虚构的。',
    sampleTitles: {
      'medical-bill': '医院账单',
      eob: '看起来像账单的保险说明',
      'tax-proposed': '建议调整税额的税务通知',
    },
    add: '打开照片或 PDF',
    addNote: '照片和 PDF 只在此浏览器中打开，不会上传。',
    noPictures: '此浏览器的设备端模型看不了图片，所以这里读不了照片或扫描版 PDF。带文字层的 PDF 仍然可以读。',
    unsupportedFile: (name: string) => `Letterkind 打不开 ${name}。它能打开照片（JPEG、PNG、WebP）、PDF 和纯文本文件。`,
    leftOut: (n: number, read: number) =>
      n === 1 ? `最后一页没有读：Letterkind 只读前 ${read} 页。` : `最后 ${n} 页没有读：Letterkind 只读前 ${read} 页。`,
    fromFile: '这段文字是在本设备上直接从您的文件里取出的，没有用模型。请先核对，再读信。',
    fromPicture: (ms: number) =>
      `设备端模型用 ${Math.round(ms / 1000)} 秒从您的图片里抄出了这段文字。请把金额、日期和号码与原信逐一对照，改正错误后再继续：Letterkind 接下来告诉您的内容，都是对照这段文字核对的，而不是对照图片。`,
    unreadable: (n: number) =>
      n === 1
        ? '模型把一处标成了 [unreadable]（看不清）。如果这处重要，请照原信补上。'
        : `模型把 ${n} 处标成了 [unreadable]（看不清）。如果这些地方重要，请照原信补上。`,
    pictureOf: (page: number) => `您信件的第 ${page} 页`,
  },

  progress: {
    classifying: '正在判断这是哪一类信件…',
    extracting: '正在找出信里要求您做什么…',
    opening: '正在打开文件…',
    transcribing: (page: number, pages: number) =>
      pages === 1 ? '正在本设备上抄出图片中的文字…' : `正在本设备上抄出第 ${page} 页（共 ${pages} 页）…`,
    transcribingNote: '在没有独立显卡的电脑上，每页可能要一分钟以上。文字会边读边显示，读完后可以修改。',
    stop: '停止',
  },

  where: {
    onDevice: '在本设备上',
    seconds: secs,
    line: (n: number) => `第 ${n} 行`,
    lines: (ns: readonly number[]) => `第 ${ns.join('、')} 行`,
  },

  kind: {
    heading: '这是哪一类信件',
    agreed: '设备端模型和关键词检查都这样判断。',
    modelOnly: '设备端模型这样判断，关键词检查没有给出意见。',
    keywordsOnly: '关键词检查这样判断，设备端模型没有给出可用的答案。',
    neither: '设备端模型和关键词检查都没认出这封信。',
    chosen: '这是您选的。',
    evidence: '关键词检查依据的词句：',
    choose: '对这封信有两种不同的判断',
    chooseBody: 'Letterkind 接下来显示什么取决于信件类型，所以它不会乱猜。是哪一种？',
    saidByModel: '设备端模型',
    saidByKeywords: '关键词检查',
    somethingElse: '其他',
  },

  field: {
    sender: '寄信方',
    reference: '需要引用的编号',
    phone: '联系电话',
    notStated: '信里似乎没有写。',
    notInLetter: (claimed: string) => `设备端模型回答的是「${claimed}」。信里没有这个内容，所以不把它当作事实显示。`,
    inTheLetter: '信里实际写的是：',
    noAmount: '这类信件不要求您付钱。',
    noAmountWithheld: '信里提到了金额，但对这类信件来说，没有一个是账单金额，所以不显示金额。',
    amountIsCredit: (raw: string) => `信里把 ${raw} 标为您的贷方余额（对方欠您的），不是您要付的钱，所以不显示应付金额。`,
    noDeadline: '这类信件没有给您设定期限。',
    noDeadlineWithheld: '信里提到了日期，但对这类信件来说，没有一个是期限，所以不显示日期。',
  },

  amount: {
    amount_due: '应付金额',
    proposed: '拟议金额（尚未欠款）',
    claimed: '对方声称您欠的金额',
    new_rent: '新租金',
    fine: '罚款',
    fee: '费用',
    none: '金额',
  },

  deadline: {
    pay: '付款截止',
    respond: '回复截止',
    appear: '到场日期',
    dispute: '提出异议截止',
    appeal: '申诉截止',
    enroll: '登记截止',
    renew: '续期截止',
    takes_effect: '生效日期',
    none: '期限',
  },

  days: (n: number) =>
    n === 0 ? '就是今天。' : n === 1 ? '就是明天。' : n > 1 ? `距今天还有 ${n} 天。` : n === -1 ? '已经是昨天了。' : `已经过去 ${-n} 天了。`,

  error: {
    heading: '这封信没能读出来',
    retry: '再试一次',
  },

  guidance: {
    heading: '这是什么意思，该怎么做',
    intro: 'Letterkind 可以请云端一个更大的模型，写一份这类信件的通俗解释。告诉那个模型的只有下面三件事，别的什么都没有：',
    kind: '信件类型',
    state: '所在州',
    stateNotGiven: '未填',
    stateFromLetter: (name: string) => `按信上的地址，改为 ${name}`,
    language: '语言',
    nothingElse:
      '您的信件不会发出去，信里的姓名、金额、日期和号码也都不会。解释回来时带着空位，这些空位在本设备上用对照您信件核对过的内容填上。',
    ask: '获取解释',
    checking: '正在查找本设备上已保存的解释…',
    asking: '正在请求这类信件的解释…',
    what: '这是什么信',
    steps: '该怎么做',
    ifIgnored: '如果您什么都不做',
    whoCanHelp: '谁能帮忙',
    legend: '高亮的词是在本设备上从您的信件里填进去的。写其余部分的模型从来没有看到过它们。',
    standInLegend: '斜体字表示您的信里没有可以核对的具体内容，暂时用通用说法代替。',
    fromCloud: (model: string, ms: number, bytes: number) =>
      `由云端的 ${model} 用 ${secs(ms)}写成。发给它的是 ${f.number(bytes)} 字节，没有一个来自您的信件。已保存在本设备上，下次直接用。`,
    fromSaved: (day: string) => `自 ${day} 起保存在本设备上。这次什么都没有发送。`,
    forget: '清除已保存的解释',
    rejectedHeading: '这份解释已被丢弃',
    rejectedBody: '收到了回答，但它违反了 Letterkind 的一条规则，所以一个字都不显示。',
    rejected: {
      not_json: () => '它不是要求的格式。',
      wrong_shape: () => '它不是要求的格式。',
      too_long: () => '它超过了允许的长度。',
      unknown_marker: (found: string) => `它留下了一个 Letterkind 不知道怎么填的空位（「${found}」）。`,
      marker_not_allowed_here: (found: string) => `它为这类信件没有的信息留了空位（「${found}」）。`,
      amount: (found: string) => `它自己写了一个金额（「${found}」）。金额只能来自您的信件。`,
      date: (found: string) => `它自己写了一个日期（「${found}」）。日期只能来自您的信件。`,
      phone: (found: string) => `它自己写了一个电话号码（「${found}」）。电话号码只能来自您的信件。`,
      web_address: (found: string) => `它包含网址或邮箱地址（「${found}」）。Letterkind 不显示模型写出的地址。`,
      not_in_language: () => '它不是用您所选语言的正常写法写的——用了别的文字、写成了英文，或者漏掉了重音符号。',
      blank_left_in_english: (found: string) => `它的译文里有一处让您填写的空白还是英文（「${found}」）。`,
      deadline_as_letter_date: (found: string) => `它写的信把办理期限当成了来信日期（「${found}」）。您会签上一个错误的日期，所以没有保留。`,
      names_a_program: (found: string) => `它写的信点了某个项目、计划或法律的名字（「${found}」）。它没看过您的信，不可能知道这个项目是否存在、是否适用于您，所以没有保留。Letterkind 写的信只笼统地询问有没有可用的帮助。`,
      states_the_law: (found: string) =>
        `它写的信对法律下了断言（「${found}」）。您签名的内容没人能在这里核实，所以没有保留。Letterkind 写的信只提出请求，不替寄信方解释法律。`,
      translation_differs: (found: string) => `它的译文和英文对不上：信件信息的空位（「${found}」）只在其中一份里出现。`,
    },
    askAgain: '重新请求',
    busyBody:
      '云端模型连续两次忙得没法回答。不是您这边的问题：过一分钟再请求。上面 Letterkind 从您信里读出的内容是在本设备上完成的，不受影响。',
    limitBody:
      'Letterkind 每分钟向云端模型请求的次数有上限（所有使用者合计），刚刚已经用完。不是您这边的问题：过一分钟再请求。上面 Letterkind 从您信里读出的内容是在本设备上完成的，不受影响。',
    unavailableHeading: '没能获取解释',
    unavailableBody: '每类信件第一次获取解释需要联网。上面 Letterkind 从您信里读出的内容是在本设备上完成的，不受影响。',
  },

  terms: {
    inEnglish: (heading: string) =>
      `带下划线的词收在 Letterkind 的词汇表里。点一下可以看它的一般含义。这些释义是随 Letterkind 一起提供的固定文字，人人看到的都一样：点的时候不生成任何内容，也不发送任何内容。想看其他语言，请在「${heading}」里选择。`,
    inSpanish: (heading: string) =>
      `带下划线的词收在 Letterkind 的词汇表里。点一下可以看它的一般含义，用西班牙语（「${heading}」里选的语言）显示，旁边附英文。两者都是随 Letterkind 一起提供的固定文字，人人看到的都一样：点的时候不生成任何内容，也不发送任何内容。`,
    inCloud: (language: string, heading: string) =>
      `带下划线的词收在 Letterkind 的词汇表里。点一下可以看它的一般含义，用${language}（「${heading}」里选的语言）显示。Letterkind 内置的释义只有英文和西班牙文；要看${language}，点的时候会请云端模型翻译一条。告诉它的只有您点的是哪个词（词汇表自己的词条，而不是从您信里抄的字）和语言，别的什么都没有。`,
    heading: (words: string) => `「${words}」是什么意思`,
    close: '关闭',
    asking: '正在请云端模型翻译这条释义…',
    ask: (language: string) => `翻译成${language}`,
    english: '英文原文（Letterkind 词汇表）',
    general: '这是这个词的一般含义，与您的信件或您的具体情况无关，也不是建议。',
    translated: '译文由模型翻译，可能有偏差。以英文原文为准，那是 Letterkind 负责的措辞。',
    fromGlossary: '来自 Letterkind 自带的词汇表：随应用提供的固定文字。没有生成任何内容，也没有发送任何内容。',
    fromCloud: (model: string, ms: number, bytes: number) =>
      `由云端的 ${model} 用 ${secs(ms)}翻译。发给它的是 ${f.number(bytes)} 字节：词汇表的词条和语言，没有一个来自您的信件。已保存在本设备上，下次直接用。`,
    rejectedHeading: '这份译文已被丢弃',
    rejectedBody: '收到了译文，但它违反了 Letterkind 的一条规则，所以一个字都不显示。',
    unavailableHeading: '没能获取译文',
    unavailableBody: '没有收到回答。翻译释义需要联网。下面的英文是 Letterkind 自带的，不需要联网。',
  },

  reply: {
    heading: '一封可以寄出的回信',
    intro: 'Letterkind 可以请同一个云端模型写一份这类信件的回信草稿。告诉它的还是那三件事，别的什么都没有：',
    change: '所在州和语言就是上面选的。',
    nothingElse:
      '您的信件不会发出去，您的姓名和您想说的话也不会。草稿回来时，信件信息的位置留着空位，在本设备上填好；只有您自己知道的内容，用方括号留空。',
    ask: '起草回信',
    checking: '正在查找本设备上已保存的草稿…',
    asking: '正在请求这类信件的回信草稿…',
    toSend: '要寄出的回信',
    subject: '主题：',
    legend: '高亮的词是在本设备上从您的信件里填进去的。',
    blanks: (n: number) => `有 ${n} 处方括号需要您手动填写。`,
    copy: '复制回信',
    copied: '已复制',
    copyFailed: '没能复制回信。请选中文字后手动复制。',
    translatedHeading: (language: string) => `回信内容（${language}）`,
    translatedNote: '这份是给您看的，不要寄出。寄出的是上面那份：给您写信的机构读的是英文。',
    beforeSending: '寄出之前',
    draftNote: '这只是草稿，不是法律意见。请逐行读完，改掉不符合您情况的地方，并保留一份寄出内容的副本。',
    fromCloud: (model: string, ms: number, bytes: number) =>
      `由云端的 ${model} 用 ${secs(ms)}起草。发给它的是 ${f.number(bytes)} 字节，没有一个来自您的信件。已保存在本设备上，下次直接用。`,
    rejectedHeading: '这份草稿已被丢弃',
    unavailableHeading: '没能获取草稿',
    unavailableBody: '每类信件第一次起草回信需要联网。上面 Letterkind 从您信里读出的内容是在本设备上完成的，不受影响。',
  },

  ledger: {
    heading: '离开过本设备的内容',
    nothing: '没有任何内容离开过本设备。',
    sent: (n: number, bytes: number) => `已发送 ${n} 个请求，共 ${f.number(bytes)} 字节，没有一个字节来自信件。`,
    attempted: (n: number) => `尝试了 ${n} 个请求，没有拿到结果。`,
    stayed: (n: number) => `${n} 个请求在本设备上得到了回答。`,
    underway: (n: number) => `${n} 个请求正在进行。`,
    underwayLabel: '进行中',
    note: '读信由这个浏览器里的模型完成，不发送任何内容。这里逐字列出 Letterkind 向浏览器以外的模型发出的每一个请求。',
    appCheck:
      '第一次发出请求时还会发生一件事：本页会加载 Google reCAPTCHA，让服务器确认请求来自本应用而不是脚本。Letterkind 不会把您信里的任何内容交给它。在此之前不会加载。',
    purpose: {
      explain: '某类信件的解释',
      reply: '回信草稿',
      term: '词语释义',
    },
    left: {
      sent: '已发送',
      attempted: '尝试发送',
      stayed: '留在本设备上',
    },
    ran: {
      cloud: '在云端回答',
      device: '在本设备上回答',
      nowhere: '没有回答',
    },
    term: '词语',
    bytes: (n: number) => `${f.number(n)} 字节`,
    words: '实际发送的原文',
    wordsNote: '这些文字是应用里固定的：任何人选了同样的信件类型、州和语言，发出的都一模一样。随附一份固定的回答格式说明。',
  },

  kinds: {
    tax_balance_due: '税单（欠税）',
    tax_proposed_change: '报税表拟议调整',
    tax_identity_verification: '税务身份核验',
    tax_refund_or_information: '退税或税务信息通知',
    medical_bill: '医疗账单',
    insurance_eob: '保险福利说明（EOB，不是账单）',
    insurance_denial: '保险拒赔',
    utility_bill: '水电煤账单',
    utility_shutoff: '停水停电停气警告',
    debt_collection: '催债信',
    eviction_notice: '驱逐通知',
    rent_increase_or_lease_change: '涨租或租约变更',
    court_summons_or_lawsuit: '法院传票（您被起诉了）',
    jury_summons: '陪审员传票',
    traffic_or_parking_ticket: '交通或停车罚单',
    benefits_renewal: '福利续期',
    benefits_denial_or_reduction: '福利被拒、减少或终止',
    immigration_appointment: '移民局预约',
    immigration_request_for_evidence: '移民局补件通知（RFE）',
    school_notice: '学校通知',
    bank_or_credit_notice: '银行或信用通知',
    data_breach_notice: '数据泄露通知',
    vehicle_registration_or_recall: '车辆注册或召回',
    other: '其他类型的信件',
  },

  languages: {
    en: '英语',
    es: '西班牙语',
    'zh-Hans': '简体中文',
    'zh-Hant': '繁体中文',
    vi: '越南语',
    tl: '他加禄语',
    ko: '韩语',
    ar: '阿拉伯语',
    ru: '俄语',
    ht: '海地克里奥尔语',
    pt: '葡萄牙语',
    fr: '法语',
  },
};
