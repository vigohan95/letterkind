import { formats, type Strings } from './en';

const f = formats('es-US');

/**
 * The interface in Spanish (as used in the United States, addressing the
 * reader as «usted»). Same shape as `en`; nothing here is written by a model
 * at run time. Names of US offices and forms stay in English, as they appear
 * in the letters.
 */
export const es: Strings = {
  lang: 'es',
  format: f,
  appName: 'Letterkind',
  interfaceLanguage: 'Idioma',
  tagline: 'Pegue, fotografíe o abra una carta oficial. Se lee en este dispositivo y nunca sale de él.',
  notAdvice: 'Letterkind le ayuda a leer una carta. No es asesoría legal, fiscal ni médica.',

  device: {
    checking: 'Comprobando si este navegador puede leer cartas en el dispositivo…',
    ready: 'Modelo del dispositivo listo. Su carta se lee aquí, en este navegador.',
    downloadable: 'Este navegador puede leer cartas en el dispositivo, pero primero tiene que descargar su modelo (una sola vez).',
    downloading: 'Descargando el modelo del dispositivo…',
    unavailable: 'Este dispositivo no puede ejecutar el modelo integrado del navegador, así que Letterkind no puede leer una carta aquí.',
    unsupported: 'Este navegador no tiene un modelo integrado. Letterkind necesita una versión reciente de Chrome para computadora para leer una carta en el dispositivo.',
    download: 'Descargar el modelo del dispositivo',
    downloadFailed: 'No se pudo preparar el modelo',
  },

  input: {
    label: 'La carta',
    placeholder: 'Pegue aquí el texto de la carta.',
    read: 'Leer esta carta',
    again: 'Leer otra carta',
    samples: 'O pruebe con un ejemplo inventado:',
    sampleNote: 'Carta de ejemplo. El remitente, los nombres y los números son inventados.',
    sampleTitles: {
      'medical-bill': 'Factura del hospital',
      eob: 'Aviso del seguro que parece una factura',
      'tax-proposed': 'Aviso de impuestos que propone un cambio',
    },
    add: 'Abrir una foto o un PDF',
    addNote: 'Las fotos y los PDF se abren en este navegador. No se suben a ningún sitio.',
    noPictures:
      'El modelo del dispositivo de este navegador no puede ver imágenes, así que aquí no se puede leer una foto ni un PDF escaneado. Un PDF que contiene su texto sí se puede.',
    unsupportedFile: (name: string) => `Letterkind no puede abrir ${name}. Abre fotos (JPEG, PNG, WebP), PDF y archivos de texto sin formato.`,
    leftOut: (n: number, read: number) =>
      n === 1
        ? `Se omitió la última página: Letterkind lee las primeras ${read} páginas.`
        : `Se omitieron las últimas ${n} páginas: Letterkind lee las primeras ${read} páginas.`,
    fromFile: 'Este texto se sacó de su archivo, en este dispositivo, sin ningún modelo. Revíselo y luego lea la carta.',
    fromPicture: (ms: number) =>
      `El modelo del dispositivo copió este texto de su imagen en ${Math.round(ms / 1000)} segundos. Compare las cantidades, las fechas y los números con la carta misma y corrija cualquier error antes de seguir: lo que Letterkind le diga después se comprueba contra este texto, no contra la imagen.`,
    unreadable: (n: number) =>
      n === 1
        ? 'El modelo marcó un lugar como [unreadable] (ilegible). Complételo con lo que dice la carta si es importante.'
        : `El modelo marcó ${n} lugares como [unreadable] (ilegible). Complételos con lo que dice la carta si son importantes.`,
    pictureOf: (page: number) => `Página ${page} de su carta`,
  },

  progress: {
    classifying: 'Averiguando qué tipo de carta es…',
    extracting: 'Buscando lo que le pide a usted…',
    opening: 'Abriendo el archivo…',
    transcribing: (page: number, pages: number) =>
      pages === 1 ? 'Copiando el texto de la imagen, en este dispositivo…' : `Copiando la página ${page} de ${pages}, en este dispositivo…`,
    transcribingNote:
      'En una computadora sin tarjeta gráfica esto puede tardar un minuto o más por página. El texto aparece a medida que se lee, y puede corregirlo después.',
    stop: 'Detener',
  },

  where: {
    onDevice: 'En el dispositivo',
    seconds: (ms: number) => `${f.number(Number((ms / 1000).toFixed(1)))} s`,
    line: (n: number) => `línea ${n}`,
    lines: (ns: readonly number[]) => (ns.length === 1 ? `línea ${ns[0]}` : `líneas ${ns.join(', ')}`),
  },

  kind: {
    heading: 'Qué tipo de carta es',
    agreed: 'El modelo del dispositivo y una comprobación por palabras clave coinciden.',
    modelOnly: 'Lo dice el modelo del dispositivo. La comprobación por palabras clave no dio opinión.',
    keywordsOnly: 'Lo dice una comprobación por palabras clave. El modelo del dispositivo no dio una respuesta útil.',
    neither: 'Ni el modelo del dispositivo ni la comprobación por palabras clave reconocieron esta carta.',
    chosen: 'Usted lo eligió.',
    evidence: 'Frases en las que se basó la comprobación por palabras clave:',
    choose: 'Dos lecturas de esta carta no coinciden',
    chooseBody: 'Lo que Letterkind muestra después depende del tipo de carta, así que no va a adivinar. ¿Cuál es?',
    saidByModel: 'el modelo del dispositivo',
    saidByKeywords: 'la comprobación por palabras clave',
    somethingElse: 'Otra cosa',
  },

  field: {
    sender: 'Quién la envía',
    reference: 'Número que debe citar',
    phone: 'Teléfono al que llamar',
    notStated: 'La carta no parece indicarlo.',
    notInLetter: (claimed: string) =>
      `El modelo del dispositivo respondió «${claimed}». Eso no aparece en la carta, así que no se muestra como un hecho.`,
    inTheLetter: 'Lo que sí contiene la carta:',
    noAmount: 'Este tipo de carta no le pide que pague nada.',
    noAmountWithheld:
      'La carta menciona cantidades, pero en este tipo de carta ninguna es una factura. No se muestra ninguna cantidad.',
    amountIsCredit: (raw: string) =>
      `La carta muestra ${raw} como un saldo a su favor, no como una cantidad que usted debe. No se muestra ninguna cantidad a pagar.`,
    noDeadline: 'Este tipo de carta no le fija ningún plazo.',
    noDeadlineWithheld:
      'La carta menciona fechas, pero en este tipo de carta ninguna es un plazo. No se muestra ninguna fecha.',
  },

  amount: {
    amount_due: 'Cantidad a pagar',
    proposed: 'Cantidad propuesta (todavía no la debe)',
    claimed: 'Cantidad que dicen que usted debe',
    new_rent: 'Renta nueva',
    fine: 'Multa',
    fee: 'Cargo',
    none: 'Cantidad',
  },

  deadline: {
    pay: 'Pagar a más tardar el',
    respond: 'Responder a más tardar el',
    appear: 'Presentarse el',
    dispute: 'Disputar a más tardar el',
    appeal: 'Apelar a más tardar el',
    enroll: 'Inscribirse a más tardar el',
    renew: 'Renovar a más tardar el',
    takes_effect: 'Entra en vigor el',
    none: 'Plazo',
  },

  days: (n: number) =>
    n === 0
      ? 'Es hoy.'
      : n === 1
        ? 'Es mañana.'
        : n > 1
          ? `Dentro de ${n} días.`
          : n === -1
            ? 'Fue ayer.'
            : `Fue hace ${-n} días.`,

  error: {
    heading: 'No se pudo leer la carta',
    retry: 'Intentar de nuevo',
  },

  guidance: {
    heading: 'Qué significa y qué hacer',
    intro:
      'Letterkind puede traer una explicación sencilla de este tipo de carta, escrita por un modelo más grande en la nube. A ese modelo se le dicen estas tres cosas y nada más:',
    kind: 'Tipo de carta',
    state: 'Estado',
    stateNotGiven: 'Sin indicar',
    stateFromLetter: (name: string) => `Usar ${name}, según la dirección de su carta`,
    language: 'Idioma',
    nothingElse:
      'Su carta no se envía, ni tampoco ningún nombre, cantidad, fecha o número que contenga. La explicación vuelve con huecos, y los huecos se rellenan aquí con lo que se comprobó contra su carta.',
    ask: 'Obtener la explicación',
    checking: 'Buscando una explicación ya guardada en este dispositivo…',
    asking: 'Pidiendo una explicación de este tipo de carta…',
    what: 'Qué es esta carta',
    steps: 'Qué hacer',
    ifIgnored: 'Si no hace nada',
    whoCanHelp: 'Quién puede ayudar',
    legend: 'Las palabras resaltadas se pusieron en este dispositivo, sacadas de su carta. El modelo que escribió el resto nunca las vio.',
    standInLegend: 'Las palabras en cursiva están donde su carta no daba un dato que se pudiera comprobar.',
    fromCloud: (model: string, ms: number, bytes: number) =>
      `Escrita por ${model} en la nube en ${f.number(Number((ms / 1000).toFixed(1)))} s. Se le enviaron ${f.number(bytes)} bytes, ninguno de su carta. Guardada en este dispositivo para la próxima vez.`,
    fromSaved: (day: string) => `Guardada en este dispositivo desde el ${day}. Esta vez no se envió nada.`,
    forget: 'Olvidar las explicaciones guardadas',
    rejectedHeading: 'Se descartó la explicación',
    rejectedBody: 'Llegó una respuesta, pero incumplía una de las reglas de Letterkind, así que no se muestra nada de ella.',
    rejected: {
      not_json: () => 'No tenía la forma que se pidió.',
      wrong_shape: () => 'No tenía la forma que se pidió.',
      too_long: () => 'Era más larga de lo permitido.',
      unknown_marker: (found: string) => `Dejó un hueco que Letterkind no sabe rellenar («${found}»).`,
      marker_not_allowed_here: (found: string) => `Dejó un hueco («${found}») para un dato que este tipo de carta no tiene.`,
      amount: (found: string) => `Contenía una cantidad propia («${found}»). Una cantidad solo puede venir de su carta.`,
      date: (found: string) => `Contenía una fecha propia («${found}»). Una fecha solo puede venir de su carta.`,
      phone: (found: string) => `Contenía un número de teléfono propio («${found}»). Un número de teléfono solo puede venir de su carta.`,
      web_address: (found: string) => `Contenía una dirección web o de correo («${found}»). Letterkind no muestra direcciones escritas por un modelo.`,
      not_in_language: () =>
        'No estaba escrita como se escribe el idioma que eligió: con otro alfabeto, en inglés o sin los acentos.',
      blank_left_in_english: (found: string) => `Su traducción dejó en inglés un espacio para que usted lo rellene («${found}»).`,
      deadline_as_letter_date: (found: string) =>
        `Su carta usaba la fecha límite como si fuera la fecha de su carta («${found}»). Usted firmaría una fecha equivocada, así que no se guardó.`,
      names_a_program: (found: string) =>
        `Su carta nombraba un programa, plan o ley («${found}»). No vio su carta y no podía saber si existe o si le corresponde, así que no se guardó. Una carta de Letterkind pregunta en términos generales si hay ayuda disponible.`,
      states_the_law: (found: string) =>
        `Su carta afirmaba algo sobre la ley («${found}»). Usted estaría firmando algo que nadie aquí puede comprobar, así que no se guardó. Una carta de Letterkind pregunta; no le dice al remitente lo que dice la ley.`,
      translation_differs: (found: string) =>
        `Su traducción no coincidía con el inglés: un hueco para un dato de su carta («${found}») estaba en una y no en la otra.`,
    },
    askAgain: 'Volver a pedir',
    busyBody:
      'El modelo en la nube estaba demasiado ocupado para responder, dos veces seguidas. No es un problema suyo: vuelva a pedirlo en un minuto. Lo que Letterkind leyó de su carta más arriba se hizo en este dispositivo y no se ve afectado.',
    limitBody:
      'Letterkind solo puede consultar al modelo en la nube cierto número de veces por minuto, contando a todas las personas que lo usan, y ese número se acaba de alcanzar. No es un problema suyo: vuelva a pedirlo en un minuto. Lo que Letterkind leyó de su carta más arriba se hizo en este dispositivo y no se ve afectado.',
    unavailableHeading: 'No se pudo traer ninguna explicación',
    unavailableBody:
      'La primera explicación de cada tipo de carta necesita conexión. Lo que Letterkind leyó de su carta más arriba se hizo en este dispositivo y no se ve afectado.',
  },

  terms: {
    inEnglish: (heading: string) =>
      `Las palabras subrayadas están en el glosario de Letterkind. Toque una para ver lo que significa en general. Los significados son un texto fijo que viene con Letterkind, el mismo para todos: no se genera nada al tocar y no se envía nada. Para leerlos en otro idioma, elíjalo en «${heading}».`,
    inSpanish: (heading: string) =>
      `Las palabras subrayadas están en el glosario de Letterkind. Toque una para ver lo que significa en general, en español —el idioma elegido en «${heading}»— con el inglés al lado. Ambos son un texto fijo que viene con Letterkind, el mismo para todos: no se genera nada al tocar y no se envía nada.`,
    inCloud: (language: string, heading: string) =>
      `Las palabras subrayadas están en el glosario de Letterkind. Toque una para ver lo que significa en general, en ${language} —el idioma elegido en «${heading}»—. Los significados están escritos en Letterkind en inglés y en español; para el ${language}, al tocar se le pide al modelo en la nube que traduzca uno. Se le dice qué palabra consultó —la entrada del propio glosario, no palabras copiadas de su carta— y el idioma, y nada más.`,
    heading: (words: string) => `Qué significa «${words}»`,
    close: 'Cerrar',
    asking: 'Pidiendo al modelo en la nube que traduzca el significado…',
    ask: (language: string) => `Traducir al ${language}`,
    english: 'En inglés, tal como lo tiene el glosario de Letterkind',
    general: 'Esto es lo que la palabra significa en general. No dice nada sobre su carta ni sobre su caso, y no es un consejo.',
    translated: 'La traducción la hizo un modelo, y una traducción puede no ser exacta. El inglés es el texto que respalda Letterkind.',
    fromGlossary: 'Del glosario propio de Letterkind: texto fijo que viene con la aplicación. No se generó nada y no se envió nada.',
    fromCloud: (model: string, ms: number, bytes: number) =>
      `Traducido por ${model} en la nube en ${f.number(Number((ms / 1000).toFixed(1)))} s. Se le enviaron ${f.number(bytes)} bytes: la entrada del glosario y el idioma, nada de su carta. Guardado en este dispositivo para la próxima vez.`,
    rejectedHeading: 'Se descartó la traducción',
    rejectedBody: 'Llegó una traducción, pero incumplía una de las reglas de Letterkind, así que no se muestra nada de ella.',
    unavailableHeading: 'No se pudo obtener ninguna traducción',
    unavailableBody:
      'No llegó ninguna respuesta. Traducir un significado necesita conexión. El inglés de abajo es de Letterkind y no la necesita.',
  },

  reply: {
    heading: 'Una respuesta que puede enviar',
    intro:
      'Letterkind puede traer un borrador de respuesta a este tipo de carta, escrito por el mismo modelo en la nube. Se le dicen las mismas tres cosas y nada más:',
    change: 'El estado y el idioma son los elegidos más arriba.',
    nothingElse:
      'Su carta no se envía, ni su nombre ni nada de lo que quiera decir. El borrador vuelve con huecos para los datos de su carta, que se rellenan aquí, y con espacios entre corchetes para lo que solo usted sabe.',
    ask: 'Redactar una respuesta',
    checking: 'Buscando un borrador ya guardado en este dispositivo…',
    asking: 'Pidiendo un borrador de respuesta a este tipo de carta…',
    toSend: 'La respuesta que se envía',
    subject: 'Asunto:',
    legend: 'Las palabras resaltadas se pusieron en este dispositivo, sacadas de su carta.',
    blanks: (n: number) =>
      n === 1
        ? 'Queda 1 espacio entre corchetes para que usted lo rellene a mano.'
        : `Quedan ${n} espacios entre corchetes para que usted los rellene a mano.`,
    copy: 'Copiar la respuesta',
    copied: 'Copiada',
    copyFailed: 'No se pudo copiar la respuesta. Seleccione el texto y cópielo a mano.',
    translatedHeading: (language: string) => `Lo que dice, en ${language}`,
    translatedNote:
      'Para que usted lo lea, no para enviarlo. La respuesta de arriba es la que se envía: la oficina que le escribió lee inglés.',
    beforeSending: 'Antes de enviarla',
    draftNote:
      'Esto es un borrador, no asesoría legal. Lea cada línea, cambie lo que no corresponda a su caso y guarde una copia de lo que envíe.',
    fromCloud: (model: string, ms: number, bytes: number) =>
      `Redactado por ${model} en la nube en ${f.number(Number((ms / 1000).toFixed(1)))} s. Se le enviaron ${f.number(bytes)} bytes, ninguno de su carta. Guardado en este dispositivo para la próxima vez.`,
    rejectedHeading: 'Se descartó el borrador',
    unavailableHeading: 'No se pudo traer ningún borrador',
    unavailableBody:
      'El primer borrador de cada tipo de carta necesita conexión. Lo que Letterkind leyó de su carta más arriba se hizo en este dispositivo y no se ve afectado.',
  },

  ledger: {
    heading: 'Lo que ha salido de este dispositivo',
    nothing: 'Nada ha salido de este dispositivo.',
    sent: (n: number, bytes: number) =>
      `${n === 1 ? '1 solicitud enviada' : `${n} solicitudes enviadas`}, ${f.number(bytes)} bytes en total. Nada de ello de una carta.`,
    attempted: (n: number) =>
      n === 1 ? 'Se intentó 1 solicitud y no trajo nada.' : `Se intentaron ${n} solicitudes y no trajeron nada.`,
    stayed: (n: number) => (n === 1 ? '1 solicitud se respondió en este dispositivo.' : `${n} solicitudes se respondieron en este dispositivo.`),
    underway: (n: number) => (n === 1 ? '1 solicitud está en curso.' : `${n} solicitudes están en curso.`),
    underwayLabel: 'En curso',
    note: 'Leer una carta lo hace el modelo dentro de este navegador y no envía nada. Esta lista contiene, palabra por palabra, cada solicitud que Letterkind hizo a un modelo fuera de él.',
    appCheck:
      'La primera vez que sale una solicitud ocurre una cosa más: se carga Google reCAPTCHA en esta página, para que el servidor sepa que la solicitud viene de esta aplicación y no de un script. Letterkind no le pasa nada de su carta. No se carga antes de eso.',
    purpose: {
      explain: 'Explicación de un tipo de carta',
      reply: 'Borrador de respuesta',
      term: 'Significado de un término',
    },
    left: {
      sent: 'Enviada',
      attempted: 'Se intentó enviar',
      stayed: 'Se quedó en este dispositivo',
    },
    ran: {
      cloud: 'respondida en la nube',
      device: 'respondida en este dispositivo',
      nowhere: 'sin respuesta',
    },
    term: 'Término',
    bytes: (n: number) => `${f.number(n)} bytes`,
    words: 'Las palabras exactas que se enviaron',
    wordsNote:
      'Estas palabras son fijas en la aplicación: quien elija el mismo tipo de carta, estado e idioma envía las mismas. Las acompaña una descripción fija de la forma que debe tener la respuesta.',
  },

  kinds: {
    tax_balance_due: 'Factura de impuestos',
    tax_proposed_change: 'Cambio propuesto a una declaración de impuestos',
    tax_identity_verification: 'Verificación de identidad fiscal',
    tax_refund_or_information: 'Aviso de reembolso o de información fiscal',
    medical_bill: 'Factura médica',
    insurance_eob: 'Explicación de beneficios (no es una factura)',
    insurance_denial: 'Denegación del seguro',
    utility_bill: 'Factura de servicios (luz, agua, gas)',
    utility_shutoff: 'Aviso de corte de servicio',
    debt_collection: 'Carta de cobro de deudas',
    eviction_notice: 'Aviso de desalojo',
    rent_increase_or_lease_change: 'Aumento de renta o cambio de contrato',
    court_summons_or_lawsuit: 'Citación judicial (le están demandando)',
    jury_summons: 'Citación para jurado',
    traffic_or_parking_ticket: 'Multa de tránsito o de estacionamiento',
    benefits_renewal: 'Renovación de beneficios',
    benefits_denial_or_reduction: 'Beneficios negados, reducidos o terminados',
    immigration_appointment: 'Cita de inmigración',
    immigration_request_for_evidence: 'Solicitud de evidencia de inmigración',
    school_notice: 'Aviso de la escuela',
    bank_or_credit_notice: 'Aviso del banco o de crédito',
    data_breach_notice: 'Aviso de filtración de datos',
    vehicle_registration_or_recall: 'Registro del vehículo o llamado a revisión',
    other: 'Otro tipo de carta',
  },

  languages: {
    en: 'inglés',
    es: 'español',
    'zh-Hans': 'chino (simplificado)',
    'zh-Hant': 'chino (tradicional)',
    vi: 'vietnamita',
    tl: 'tagalo',
    ko: 'coreano',
    ar: 'árabe',
    ru: 'ruso',
    ht: 'criollo haitiano',
    pt: 'portugués',
    fr: 'francés',
  },
};
