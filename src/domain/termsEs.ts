/**
 * The glossary in Spanish: one meaning for every entry of `terms.ts`, keyed
 * by the entry's English words so that a missing or misspelt one fails the
 * type check.
 *
 * Like the English, this is fixed text that ships with the app: nothing is
 * generated when a reader taps a word, and nothing is sent. It is written in
 * formal, plain Spanish as it is used in the United States, it names the
 * established Spanish term where there is one, and it keeps the names of
 * programs, agencies and forms as letters print them. It follows the rules
 * the English follows: no amounts, dates, phone numbers or addresses, and no
 * advice.
 *
 * Each meaning says what its English counterpart says. When an English
 * meaning changes, change the Spanish with it.
 */
import type { TermWords } from './terms';

export const MEANINGS_ES: Readonly<Record<TermWords, string>> = {
  // Money owed, bills, collections
  'balance due': 'El saldo pendiente: la cantidad que usted todavía debe en este momento, después de los pagos que ya hizo.',
  'past due': 'Vencido: no se pagó en la fecha en que debía pagarse. A una cantidad vencida se le pueden añadir cargos por pago tardío.',
  delinquent: 'En mora, es decir, atrasado. Una cuenta o un pago está en mora cuando no se pagó en su fecha de vencimiento.',
  'minimum payment':
    'El pago mínimo: la cantidad más pequeña que usted puede pagar antes de la fecha de vencimiento para mantener la cuenta al día. Pagar solo esa cantidad normalmente significa que el resto sigue creciendo con intereses.',
  'late fee': 'Un cargo adicional que se añade porque un pago llegó después de su fecha de vencimiento.',
  'finance charge':
    'El cargo por financiamiento: lo que le cuesta pedir prestado, expresado como una cantidad de dinero. Incluye los intereses y ciertos cargos.',
  interest:
    'Los intereses: dinero que se cobra por deber dinero a lo largo del tiempo. Cuanto más tiempo queda sin pagar una cantidad, más intereses se añaden.',
  penalty:
    'Una multa o recargo: una cantidad adicional que se cobra por un atraso o por no cumplir una regla. Es distinta de los intereses.',
  principal: 'El capital: la cantidad original que se debe, sin contar intereses ni cargos.',
  statement:
    'Un estado de cuenta: un resumen de una cuenta durante un período, con lo que se cobró, lo que se pagó y lo que todavía se debe. Un estado de cuenta no siempre es una factura.',
  'itemized bill':
    'Una factura detallada: enumera cada servicio o artículo con su precio, uno por uno, en lugar de dar solo un total. Los pacientes y los clientes pueden pedirla.',
  'payment plan':
    'Un plan de pagos: un acuerdo para pagar lo que usted debe en cantidades más pequeñas a lo largo del tiempo, en lugar de todo de una vez.',
  'installment agreement':
    'Un plan de pagos a plazos formal, muchas veces con una agencia de impuestos, por el cual usted paga lo que debe en cantidades mensuales.',
  hardship:
    'Una situación que hace muy difícil pagar, como perder el empleo, una enfermedad o gastos médicos altos. Muchos remitentes tienen opciones especiales para personas con dificultades económicas, pero por lo general solo para quienes las solicitan.',
  'financial assistance':
    'Asistencia financiera: un programa que reduce o cancela una factura para personas con ingresos bajos. Los hospitales suelen tener uno, y normalmente hay que solicitarlo.',
  'charity care':
    'La atención de caridad: atención hospitalaria gratuita o a precio reducido para personas que no pueden pagar. Normalmente hay que solicitarla, con comprobantes de ingresos.',
  'collection agency':
    'Una agencia de cobranza: una empresa cuyo negocio es cobrar deudas impagas. Puede estar trabajando para la empresa a la que usted le debía, o puede haber comprado la deuda.',
  'debt collector':
    'Un cobrador de deudas: una persona o empresa que cobra deudas que se le deben a otro. La ley federal limita lo que un cobrador de deudas puede decir y hacer.',
  'original creditor':
    'El acreedor original: la empresa a la que usted le debía el dinero al principio, antes de que la deuda pasara a un cobrador.',
  'validation notice':
    'Un aviso de validación: un aviso que el cobrador de deudas está obligado a enviar, en el que dice cuánto afirma que usted debe, a quién afirma que se lo debe y cómo puede usted disputar la deuda.',
  dispute:
    'Disputar: decirle al remitente, normalmente por escrito, que usted cree que algo está mal, como la cantidad o si de verdad la debe.',
  'charge-off':
    'Cuando un prestamista anota una deuda en sus propios libros como pérdida porque lleva mucho tiempo sin pagarse. La deuda puede seguir debiéndose y todavía puede cobrarse.',
  settlement:
    'Un acuerdo que pone fin a una deuda o a una disputa, muchas veces pagando menos de la cantidad total reclamada. Normalmente se pone por escrito.',
  'statute of limitations':
    'El plazo de prescripción: el límite de tiempo para demandar a alguien. Cuando se cumple, normalmente una demanda por una deuda antigua puede ser rechazada, pero la deuda en sí no desaparece. El plazo depende del estado y del tipo de deuda.',
  'credit report':
    'Un informe de crédito: un registro de sus préstamos, tarjetas de crédito e historial de pagos, que llevan las agencias de informes de crédito. Lo consultan prestamistas, arrendadores y otros.',
  'credit bureau':
    'Una agencia de informes de crédito: una empresa que reúne información sobre cómo las personas pagan sus deudas y vende informes de crédito. Las tres grandes son Equifax, Experian y TransUnion.',
  garnishment:
    'Un embargo de salario o de cuenta: dinero que se toma directamente de su sueldo o de su cuenta bancaria para pagar una deuda, normalmente después de una orden judicial.',
  levy: 'Un embargo: la incautación legal de su dinero o de sus bienes para pagar una deuda, por ejemplo tomando dinero de una cuenta bancaria.',
  lien: 'Un gravamen: un derecho legal sobre un bien suyo, como una casa o un automóvil, a causa de una deuda. Puede impedirle vender o refinanciar hasta que la deuda se pague.',
  offset:
    'Una compensación: cuando el dinero que a usted le deben, como un reembolso de impuestos o un pago de beneficios, se retiene para pagar una deuda que usted tiene.',
  overpayment:
    'Un pago en exceso: se pagó más dinero del que se debía. En una carta sobre beneficios suele significar que la agencia dice que le pagó de más y quiere que se lo devuelva. En una factura significa que usted pagó de más.',
  waiver:
    'Una exención o renuncia: la decisión de renunciar a un derecho o a un requisito. Por ejemplo, una agencia puede perdonar una deuda o un cargo, y entonces no hay que pagarlo. Normalmente hay que solicitarla.',
  'write-off':
    'Una cantidad que el remitente ha decidido no cobrar. En una factura médica suele significar que a usted no se le pide pagar esa parte.',

  // Health care and insurance
  'explanation of benefits':
    'La explicación de beneficios: un resumen de la aseguradora de salud que muestra lo que cobró un proveedor, lo que pagó el plan y lo que usted podría deber. No es una factura.',
  claim:
    'Un reclamo o reclamación: una solicitud de pago o de beneficios. En el seguro de salud, es la solicitud que se envía a la aseguradora para que pague la atención. En otras cartas puede ser una solicitud de beneficios o una exigencia presentada ante un tribunal.',
  deductible:
    'El deducible es la cantidad que usted paga cada año por la atención cubierta antes de que su plan de salud empiece a pagar.',
  copayment: 'El copago es una cantidad fija que usted paga por una consulta o una receta. El plan paga el resto.',
  coinsurance:
    'El coseguro es su parte del costo de la atención cubierta, expresada como porcentaje, después de que usted ha alcanzado su deducible.',
  'out-of-pocket maximum':
    'El gasto máximo de bolsillo: lo máximo que usted tiene que pagar por la atención cubierta en un año. Una vez que lo alcanza, el plan paga el costo total de la atención cubierta durante el resto de ese año.',
  premium: 'La prima: la cantidad que usted paga, normalmente cada mes, para mantener vigente el seguro, lo use o no.',
  'allowed amount':
    'La cantidad permitida: lo máximo que un plan de salud paga por un servicio cubierto. Los proveedores dentro de la red han aceptado recibirla como pago total.',
  'amount billed':
    'La cantidad facturada: el precio total que cobró un proveedor, antes de cualquier descuento o pago del seguro. Muchas veces es mucho más de lo que alguien paga en realidad.',
  'contractual adjustment':
    'El ajuste contractual: la parte del cargo de un proveedor que este acordó con su aseguradora no cobrar. Se descuenta de la factura, y usted no la debe.',
  'patient responsibility':
    'La responsabilidad del paciente: la parte de una factura médica que el proveedor o la aseguradora dice que usted mismo debe pagar.',
  'in-network':
    'Dentro de la red: que tiene un contrato con su plan de salud. Los médicos y hospitales dentro de la red han acordado precios con el plan, por lo que su atención normalmente le cuesta menos a usted.',
  'out-of-network':
    'Fuera de la red: que no tiene contrato con su plan de salud. La atención de proveedores fuera de la red normalmente le cuesta más, y el plan puede pagar poco o nada.',
  'balance billing':
    'La facturación de saldo: cuando un proveedor le cobra a usted la diferencia entre su cargo y lo que su plan permitió. La ley federal la prohíbe en muchas situaciones de emergencia y de facturas sorpresa.',
  'prior authorization':
    'La autorización previa: la aprobación que su plan de salud exige antes de pagar cierta atención o ciertos medicamentos. Sin ella, el plan puede negarse a pagar.',
  'medical necessity':
    'La necesidad médica: el juicio de un plan de salud sobre si la atención es necesaria y adecuada para su condición. Un plan puede negarse a pagar atención que decide que no es médicamente necesaria, y esa decisión se puede apelar.',
  denial:
    'Una denegación: la decisión de decir que no a un reclamo, una solicitud o una petición. Una carta de denegación normalmente tiene que decir por qué y cómo impugnarla.',
  appeal:
    'Una apelación: una solicitud formal para que una decisión se revise de nuevo y se cambie. Las apelaciones tienen plazos, que la carta normalmente indica.',
  'internal appeal':
    'Una apelación interna: una apelación ante el propio plan de salud, en la que se le pide revisar su decisión de denegar un reclamo.',
  'external review':
    'La revisión externa: la revisión de la denegación de un plan de salud por una organización independiente ajena al plan, normalmente disponible después de la apelación interna. El plan está obligado a acatar el resultado.',
  grievance:
    'Una queja formal. En los planes de salud suele tratar sobre el servicio o sobre cómo lo trataron, no sobre si se paga un reclamo.',
  'coordination of benefits':
    'La coordinación de beneficios: las reglas que deciden qué plan paga primero cuando una persona está cubierta por más de un plan de salud. Las aseguradoras a veces preguntan por otra cobertura antes de pagar un reclamo.',
  subscriber:
    'El suscriptor o titular: la persona a cuyo nombre está la póliza de seguro, muchas veces el empleado cuyo trabajo la ofrece. Los familiares incluidos en el plan figuran bajo el suscriptor.',
  dependent:
    'Un dependiente: una persona cubierta o contada a través de otra, como un hijo o cónyuge en un plan de salud, o alguien a quien un contribuyente mantiene e incluye en su declaración de impuestos.',
  'group number':
    'El número de grupo: el número que identifica al empleador o al plan de grupo por el que usted tiene su seguro de salud. Está en su tarjeta del seguro.',
  'member ID': 'El número de miembro: el número que lo identifica a usted ante su plan de salud. Está en su tarjeta del seguro.',
  provider:
    'El proveedor: quien prestó la atención o el servicio, sea un médico, un hospital, una clínica o un laboratorio. En una carta de servicios públicos, es la empresa que suministra el servicio.',
  'date of service':
    'La fecha de servicio: el día en que usted recibió la atención o el servicio que se factura, no el día en que se escribió la factura.',
  coverage:
    'La cobertura: lo que un plan de seguro o un programa de beneficios paga, y para quién. Tener cobertura significa que el plan está vigente para usted.',
  'open enrollment':
    'La inscripción abierta: el período de cada año en que usted puede inscribirse en un seguro de salud o cambiar de plan sin necesitar un motivo especial.',
  'special enrollment period':
    'Un período especial de inscripción: un plazo para inscribirse en un seguro de salud o cambiarlo fuera de la inscripción abierta, después de un acontecimiento de la vida como perder otra cobertura, mudarse, casarse o tener un hijo.',
  formulary:
    'El formulario de medicamentos: la lista de medicamentos que cubre un plan de salud. Los medicamentos que no están en la lista pueden costar más o no estar cubiertos.',
  referral:
    'Un referido o remisión: una orden escrita de su médico principal para ver a un especialista o recibir un servicio. Algunos planes no pagan sin ella.',
  COBRA:
    'Una ley federal que permite a muchas personas conservar el plan de salud de su empleador por un tiempo limitado después de dejar un empleo o perder la cobertura, normalmente pagando ellas mismas la prima completa.',

  // Taxes
  notice:
    'Un aviso: una carta oficial que le informa de una decisión, un cambio, un plazo o una cantidad que se debe. Muchas veces el plazo para responder empieza a contar desde el aviso.',
  'tax year':
    'El año tributario: el período de doce meses que cubre una declaración de impuestos. Para la mayoría de las personas es el año calendario, y la declaración se presenta en la primavera del año siguiente.',
  'adjusted gross income':
    'El ingreso bruto ajustado: su ingreso total del año menos ciertos ajustes específicos, antes de la deducción estándar o de las deducciones detalladas. Muchas reglas de impuestos y límites de beneficios se basan en él.',
  'taxable income':
    'El ingreso tributable: la parte de su ingreso sobre la que realmente se calcula el impuesto, después de restar las deducciones.',
  withholding:
    'La retención: el impuesto que su empleador u otro pagador descuenta de su paga y envía al gobierno por usted durante el año.',
  'estimated tax':
    'El impuesto estimado: el impuesto que usted mismo paga durante el año, normalmente cuatro veces, sobre ingresos que no tienen retención, como los del trabajo por cuenta propia.',
  refund: 'Un reembolso: dinero que se le devuelve porque usted pagó más de lo que debía.',
  'tax credit':
    'Un crédito tributario: una cantidad que se resta directamente del impuesto que usted debe. Algunos créditos se le pueden pagar aunque usted no deba impuesto.',
  deduction:
    'Una deducción: una cantidad que se resta de su ingreso antes de calcular el impuesto, lo que reduce el impuesto. En un talón de pago significa dinero que se descuenta de su paga.',
  'filing status':
    'El estado civil para efectos de la declaración: la categoría bajo la cual usted presenta su declaración de impuestos, como soltero, casado que presenta una declaración conjunta o cabeza de familia. Afecta sus tasas de impuesto y sus deducciones.',
  'amended return':
    'Una declaración enmendada: una declaración de impuestos corregida, que se presenta para arreglar un error en una declaración ya presentada o para añadirle algo.',
  'underreported income':
    'Ingresos declarados de menos: ingresos que aparecen en los registros de la agencia de impuestos pero que, según ella, faltaban o eran demasiado bajos en su declaración. La agencia compara su declaración con los formularios que envían empleadores, bancos y otros.',
  'proposed assessment':
    'Una cantidad de impuesto adicional que la agencia tiene la intención de cobrar. Todavía no es definitiva: normalmente hay un plazo fijo para decir si se está de acuerdo o no.',
  'notice of deficiency':
    'La notificación de deficiencia: una carta formal del IRS que dice que ha determinado que usted debe más impuesto. Le da un tiempo limitado para impugnar la cantidad ante el Tribunal Tributario antes de que el IRS pueda cobrársela.',
  'failure-to-pay penalty':
    'La multa por falta de pago: una multa que se cobra por no pagar el impuesto en su fecha de vencimiento. Aumenta cada mes que el impuesto sigue sin pagarse, hasta un límite.',
  'failure-to-file penalty':
    'La multa por falta de presentación: una multa que se cobra por no presentar una declaración de impuestos en su fecha de vencimiento. Normalmente es mayor que la multa por pagar tarde.',
  abatement:
    'La reducción o eliminación de una multa o de una cantidad cobrada. A veces una multa puede reducirse o eliminarse cuando la persona tuvo un buen motivo para el atraso y lo solicita.',
  'offer in compromise':
    'Un ofrecimiento de transacción: un acuerdo con la agencia de impuestos para saldar una deuda tributaria por menos de la cantidad total, para personas que no pueden pagarla toda.',
  'currently not collectible':
    'Actualmente no cobrable: un estado que el IRS puede dar a una cuenta cuando la persona no tiene con qué pagar. El cobro se detiene por un tiempo, pero la deuda sigue existiendo y se le siguen añadiendo intereses.',
  'identity verification':
    'La verificación de identidad: demostrar que usted es quien dice ser, normalmente respondiendo preguntas o mostrando documentos. Las agencias la piden para evitar el fraude antes de pagar un reembolso o un beneficio.',
  'taxpayer identification number':
    'El número de identificación del contribuyente: el número que lo identifica ante la agencia de impuestos. Para la mayoría de las personas es el número de Seguro Social. Quienes no pueden obtener uno usan un ITIN, y los negocios usan un EIN.',
  'power of attorney':
    'Un poder legal: un documento firmado que permite a otra persona actuar por usted, por ejemplo para hablar con una agencia o firmar papeles en su nombre.',
  'Taxpayer Advocate Service':
    'El Servicio del Defensor del Contribuyente: una oficina independiente dentro del IRS que ayuda a las personas, sin costo, cuando un problema de impuestos les causa dificultades económicas o los canales normales no lo han resuelto.',
  audit:
    'Una auditoría: una revisión de su declaración o de sus registros para comprobar que lo que usted declaró es correcto. Muchas auditorías se hacen completamente por correo.',
  examination:
    'En una carta de impuestos, otra palabra para auditoría: una revisión de su declaración y de sus registros para comprobar que son correctos.',
  'response form':
    'El formulario de respuesta: la página de un aviso que usted llena y devuelve para decir si está de acuerdo o no.',
  'W-2':
    'El formulario que su empleador le entrega cada año y que muestra cuánto le pagaron y cuánto impuesto le retuvieron. Una copia también va al gobierno.',
  '1099':
    'Una familia de formularios que informan ingresos distintos del salario, como pagos por trabajo independiente, intereses o beneficios por desempleo. Una copia también va al IRS.',

  // Housing
  landlord:
    'El arrendador o propietario: el dueño de una vivienda alquilada, o la persona o empresa que la administra por el dueño.',
  tenant: 'El inquilino: una persona que alquila y habita una vivienda que pertenece a otro.',
  lease:
    'El contrato de arrendamiento: el acuerdo escrito de alquiler entre el arrendador y el inquilino. Fija la renta, cuánto dura el alquiler y las reglas para ambas partes.',
  'month-to-month tenancy':
    'Un alquiler de mes a mes: un alquiler sin fecha fija de terminación que continúa un mes a la vez. Cualquiera de las partes puede terminarlo o cambiar sus condiciones dando aviso por escrito con anticipación, según lo exija la ley del estado.',
  'security deposit':
    'El depósito de seguridad: dinero que el inquilino paga al mudarse y que el arrendador guarda por si queda renta sin pagar o hay daños. La ley del estado fija cómo y cuándo debe devolverse.',
  'notice to quit':
    'Un aviso escrito del arrendador que le dice al inquilino que debe desocupar la vivienda antes de cierta fecha. Es un paso anterior a un caso de desalojo, no una orden judicial.',
  'pay or quit':
    'Un aviso que le da al inquilino un número fijo de días para pagar la renta atrasada o desocupar la vivienda. Si no ocurre ninguna de las dos cosas, el arrendador puede presentar un caso de desalojo ante el tribunal.',
  'cure or quit':
    'Un aviso que le da al inquilino un número fijo de días para corregir un incumplimiento del contrato de arrendamiento o desocupar la vivienda.',
  'notice to vacate':
    'Un aviso escrito que dice que el inquilino debe desocupar la vivienda antes de cierta fecha. Por sí solo no es una orden judicial.',
  eviction:
    'El desalojo: el proceso legal que un arrendador debe seguir para hacer que un inquilino se vaya. Por lo general requiere un caso ante un tribunal, y el arrendador no puede simplemente impedirle la entrada al inquilino.',
  'unlawful detainer': 'El nombre que algunos estados dan a una demanda de desalojo.',
  'writ of possession':
    'Una orden judicial, emitida después de que el arrendador gana un caso de desalojo, que permite a un alguacil u otro agente del orden sacar al inquilino de la vivienda.',
  'rent increase':
    'Un aumento de la renta. Las leyes estatales y locales fijan con cuánta anticipación debe avisar por escrito el arrendador y, en algunos lugares, de cuánto puede ser el aumento.',
  renewal:
    'Una renovación: continuar algo por un nuevo período, como un contrato de arrendamiento, un beneficio o un registro. Una renovación muchas veces tiene un plazo y puede venir con condiciones nuevas.',
  holdover:
    'Quedarse en una vivienda alquilada después de que terminó el contrato de arrendamiento, sin un acuerdo nuevo. A un inquilino que se queda así normalmente se le puede cobrar renta y se le puede llevar ante un tribunal para que desocupe.',
  habitability:
    'La habitabilidad: que una vivienda alquilada reúna las condiciones básicas para vivir en ella, como calefacción, agua, instalación eléctrica segura y ausencia de goteras graves o plagas. Por lo general, los arrendadores están obligados a mantener la vivienda habitable.',
  foreclosure:
    'La ejecución hipotecaria: el proceso legal por el cual un prestamista toma y vende una vivienda porque no se pagó la hipoteca.',
  default:
    'El incumplimiento: no hacer lo que exige un acuerdo o un tribunal, como dejar de pagar las cuotas de un préstamo o no responder a una demanda.',
  escrow:
    'Dinero que guarda un tercero. En una hipoteca, es la cuenta de depósito en garantía que su administrador usa para pagar los impuestos sobre la propiedad y el seguro de la vivienda con una parte de su pago mensual.',
  'mortgage servicer':
    'El administrador del préstamo hipotecario: la empresa que cobra sus pagos de la hipoteca y administra el préstamo. Puede no ser el prestamista que otorgó el préstamo.',
  reinstatement:
    'El restablecimiento: volver a poner algo en vigor. En una hipoteca, significa pagar de una vez todo lo atrasado para detener una ejecución hipotecaria. En una licencia o una póliza, significa restaurarla después de que dejó de estar vigente.',
  'loss mitigation':
    'La mitigación de pérdidas: las opciones que tiene un administrador de préstamos hipotecarios para ayudar a un prestatario a evitar la ejecución hipotecaria, como un plan de pagos, una modificación del préstamo o una pausa en los pagos.',
  forbearance:
    'La indulgencia de morosidad: una pausa o reducción temporal de los pagos que el prestamista acepta. Las cantidades que no se pagaron se siguen debiendo más adelante.',
  'loan modification':
    'Una modificación del préstamo: un cambio permanente en las condiciones de un préstamo, como la tasa de interés o la duración, para que los pagos sean asequibles.',

  // Courts and legal process
  summons:
    'Una citación: un aviso oficial de que lo están demandando o de que debe presentarse ante el tribunal. Indica un plazo para responder, e ignorarla puede significar perder automáticamente.',
  complaint:
    'La demanda: el documento con el que empieza un juicio. Dice quién demanda, qué afirma que ocurrió y qué le pide al tribunal.',
  plaintiff: 'El demandante: la persona o empresa que inició la demanda.',
  defendant: 'El demandado: la persona o empresa a la que se demanda, o el acusado en un caso penal o de tránsito.',
  respondent:
    'La persona que tiene que responder a una petición o a una apelación presentada por otro. Es parecido a un demandado.',
  petitioner:
    'El peticionario: la persona que presentó una petición para pedirle a un tribunal o a una agencia que haga algo. Es parecido a un demandante.',
  answer:
    'La contestación: la respuesta escrita que el demandado presenta ante el tribunal frente a una demanda, en la que dice con qué está de acuerdo, qué niega y cuáles son sus defensas.',
  served:
    'Notificado oficialmente: que le entregaron documentos judiciales de una manera que la ley acepta. Los plazos para responder normalmente se cuentan desde el día de la notificación.',
  'default judgment':
    'Una sentencia en rebeldía: una decisión que un tribunal toma contra alguien que no respondió o no se presentó. La otra parte gana sin que el tribunal escuche a la parte ausente.',
  judgment:
    'La sentencia o fallo: la decisión final del tribunal en un caso, que incluye quién debe qué. Una sentencia que ordena pagar dinero puede llevar a un embargo de salario o a un gravamen.',
  hearing:
    'Una audiencia: una reunión programada ante un juez o un funcionario de audiencias en la que cada parte puede hablar y presentar pruebas.',
  continuance:
    'Un aplazamiento: pasar una audiencia o un juicio a una fecha posterior. Hay que solicitarlo y el tribunal debe aprobarlo.',
  'docket number':
    'El número de expediente: el número que un tribunal le da a un caso para seguirlo. Va en todo lo que se envíe al tribunal sobre el caso.',
  'case number':
    'El número de caso: el número que un tribunal o una agencia le da a su caso o expediente. Va en todo lo que se envíe sobre él.',
  'small claims':
    'El tribunal de reclamos menores: un tribunal para disputas por cantidades de dinero más pequeñas, con reglas más sencillas. Allí las personas normalmente hablan por sí mismas, sin abogado.',
  subpoena:
    'Una orden de presentarse a declarar como testigo o de entregar documentos. El tribunal puede castigar a quien la ignore.',
  affidavit:
    'Una declaración jurada: una declaración escrita de hechos que quien la firma jura que es verdadera, normalmente firmada ante un notario.',
  notarized:
    'Notariado: firmado ante un notario público, un funcionario que comprueba su identidad y sella el documento para confirmar que usted lo firmó.',
  'jury duty':
    'El servicio de jurado: la obligación de presentarse ante el tribunal cuando lo citan y de estar disponible para formar parte de un jurado.',
  'juror qualification questionnaire':
    'Un formulario que el tribunal envía para saber si usted reúne los requisitos para formar parte de un jurado. Por lo general, quienes lo reciben están obligados a llenarlo y devolverlo.',
  excusal:
    'Ser eximido del servicio de jurado, por ejemplo por dificultades económicas, enfermedad o por tener a alguien a su cuidado. Hay que solicitarlo al tribunal.',
  postponement:
    'Un aplazamiento: pasar algo a una fecha posterior. En el servicio de jurado, significa servir más adelante en lugar de en la fecha que indica la citación.',
  'failure to appear':
    'No presentarse ante el tribunal en la fecha en que se le ordenó. Puede llevar a una multa, a una orden de arresto o a la suspensión de la licencia.',
  'bench warrant':
    'Una orden de arresto judicial: una orden de un juez para arrestar a una persona, normalmente emitida porque no se presentó ante el tribunal o no obedeció una orden judicial.',
  citation:
    'Una boleta o citación: un aviso escrito que dice que a usted lo acusan de violar una ley, como una regla de tránsito, con instrucciones para pagar o presentarse ante el tribunal.',
  arraignment:
    'La lectura de cargos: la primera comparecencia ante el tribunal en un caso penal o de tránsito, en la que se lee el cargo y la persona dice si se declara culpable o no culpable.',
  plea: 'La declaración: la respuesta formal de una persona a un cargo, que puede ser culpable, no culpable o sin disputa.',
  'traffic school':
    'La escuela de tránsito: una clase de manejo que un tribunal puede permitirle tomar para que una multa se desestime o no añada puntos a su historial.',
  points:
    'Los puntos: marcas que se añaden a su historial de manejo por infracciones de tránsito. Demasiados puntos en un período fijo pueden subir el costo del seguro o llevar a la suspensión de la licencia.',
  'fee waiver':
    'Una exención de cuotas: el permiso para no pagar una cuota de un tribunal o de una agencia porque usted no puede pagarla. Se solicita con un formulario sobre sus ingresos.',
  'legal aid':
    'La ayuda legal: organizaciones que dan ayuda legal gratuita en asuntos civiles a personas con ingresos bajos.',
  'pro se': 'Representarse a sí mismo ante el tribunal, sin abogado.',
  mediation:
    'La mediación: una reunión en la que una persona neutral ayuda a ambas partes a tratar de llegar a un acuerdo. El mediador no decide quién gana.',
  statutory:
    'Establecido por una ley escrita. Un plazo o una cantidad de este tipo está fijado por la ley, y el remitente normalmente no puede cambiarlo.',

  // Benefits and government programs
  recertification:
    'La recertificación: la revisión periódica que hace una agencia para confirmar que usted todavía reúne los requisitos de un beneficio. Si los formularios no se devuelven a tiempo, el beneficio puede detenerse.',
  redetermination:
    'La redeterminación: una nueva revisión de si usted reúne los requisitos para un beneficio o de cuánto recibe. Puede ser una revisión de rutina o el primer nivel de apelación de una decisión.',
  'renewal form':
    'El formulario de renovación: el formulario que usted llena y devuelve para que un beneficio o una cobertura continúe por otro período.',
  eligibility:
    'La elegibilidad: si usted cumple las reglas para recibir un beneficio o un servicio, como los límites de ingresos, el tamaño del hogar o el lugar donde vive.',
  household:
    'El hogar: las personas que se cuentan juntas para un beneficio, normalmente las que viven juntas y comparten ingresos o comidas. Cada programa tiene su propia definición.',
  'gross income': 'El ingreso bruto: el ingreso antes de descontar los impuestos y otras deducciones.',
  'net income':
    'El ingreso neto: el ingreso después de descontar los impuestos y las deducciones. En los programas de beneficios, es el ingreso después de las deducciones que el programa permite.',
  'proof of income':
    'El comprobante de ingresos: documentos que muestran cuánto dinero recibe usted, como talones de pago, una declaración de impuestos, una carta de concesión de beneficios o una carta de un empleador.',
  verification:
    'La verificación: documentos u otras pruebas de que lo que usted le dijo a la agencia es cierto, como comprobantes de ingresos, de identidad o de domicilio.',
  'benefit period':
    'El período de beneficios: el tiempo para el cual se aprueba un beneficio, o durante el cual se puede pagar un reclamo. Cuando termina, puede hacer falta una nueva solicitud o una recertificación.',
  'notice of action':
    'El aviso de acción: una carta oficial de una agencia de beneficios que dice que ha aprobado, denegado, cambiado o detenido sus beneficios, con el motivo y con su derecho a apelar.',
  'adverse action':
    'Una acción adversa: una decisión que va en contra de usted, como denegar, reducir o detener un beneficio, o rechazar una solicitud de crédito o de alquiler.',
  'fair hearing':
    'Una audiencia imparcial: una audiencia en la que usted puede impugnar la decisión de una agencia de beneficios ante un funcionario imparcial. Hay que solicitarla antes de la fecha límite que indica el aviso.',
  'aid paid pending':
    'Beneficios que continúan sin cambios mientras se decide una apelación, cuando la audiencia se solicitó antes de que el cambio entrara en vigor. Si la apelación se pierde, es posible que haya que devolverlos.',
  'good cause':
    'Una causa justificada: un motivo aceptable para no cumplir un plazo o una regla, como una enfermedad o una emergencia. Demostrarla puede eliminar una sanción o reabrir un plazo.',
  sanction:
    'Una sanción: una penalización por no seguir las reglas de un programa, normalmente una reducción o una interrupción de los beneficios durante un tiempo.',
  termination:
    'La terminación, es decir, el fin. En una carta significa que un beneficio, una cobertura, un servicio, un contrato de arrendamiento o un empleo se detiene por completo.',
  suspension:
    'Una suspensión: una interrupción temporal. Un beneficio, una licencia o un servicio suspendido puede restablecerse cuando se cumplen ciertas condiciones.',
  reduction: 'Una reducción: una disminución de la cantidad de un beneficio o de un pago.',
  overissuance:
    'Cuando una agencia dio más beneficios, como los de SNAP, de lo que permitían las reglas. La agencia normalmente pide que se devuelva lo que dio de más, incluso cuando el error fue suyo.',
  Medicaid:
    'Un seguro de salud público para personas con ingresos bajos, que administra cada estado con dinero federal. En algunos estados el programa tiene otro nombre.',
  Medicare:
    'El seguro de salud federal para personas de sesenta y cinco años o más y para algunas personas más jóvenes con discapacidades.',
  SNAP: 'El Programa de Asistencia Nutricional Suplementaria, antes conocido como cupones de alimentos: dinero mensual para comprar comestibles, que se recibe en una tarjeta de beneficios.',
  TANF: 'La Asistencia Temporal para Familias Necesitadas: ayuda en efectivo para familias con hijos e ingresos muy bajos, con requisitos de trabajo y límites de tiempo.',
  SSI: 'La Seguridad de Ingreso Suplementario: pagos mensuales del Seguro Social para personas con ingresos muy bajos que son mayores, ciegas o tienen una discapacidad. No depende del historial de trabajo.',
  SSDI: 'El Seguro por Incapacidad del Seguro Social: pagos mensuales para personas que ya no pueden trabajar a causa de una discapacidad y que aportaron al Seguro Social con su trabajo anterior.',
  'unemployment insurance':
    'El seguro por desempleo: pagos temporales del estado para personas que perdieron su empleo sin tener la culpa y que están buscando trabajo.',
  claimant: 'El reclamante: la persona que presentó un reclamo, por ejemplo de beneficios por desempleo o por discapacidad.',
  'weekly certification':
    'La certificación semanal: el informe que se presenta cada semana para seguir recibiendo beneficios por desempleo, y que confirma que usted podía trabajar, que buscó trabajo y cuánto ganó.',
  determination:
    'Una determinación: la decisión oficial de una agencia sobre un reclamo o una cuestión, como si usted reúne los requisitos. Normalmente viene con un plazo para apelar.',
  reconsideration:
    'La reconsideración: una solicitud para que la agencia revise de nuevo su decisión, muchas veces por medio de otra persona. Normalmente es el primer paso de una apelación.',
  'representative payee':
    'El representante del beneficiario: una persona u organización designada para recibir y administrar los pagos del Seguro Social o de SSI de alguien que no puede administrarlos solo.',

  // Utilities
  'disconnection notice':
    'Un aviso de desconexión: una advertencia de que un servicio público se cortará en una fecha indicada o después de ella, a menos que se pague la cantidad atrasada o se llegue a un arreglo.',
  shutoff: 'El corte de un servicio público, como la electricidad, el gas o el agua, normalmente por falta de pago.',
  'reconnection fee':
    'El cargo por reconexión: un cargo por volver a conectar un servicio público después de que fue cortado.',
  'budget billing':
    'La facturación nivelada: un plan que reparte el costo anual de su servicio público en pagos mensuales iguales, para que las facturas no suban de golpe en las temporadas de mayor consumo.',
  'meter reading': 'La lectura del medidor: la medición de cuánta electricidad, gas o agua usó usted, tomada de su medidor.',
  'estimated reading':
    'Una lectura estimada: un cálculo aproximado de su consumo, basado en facturas anteriores, que se usa cuando el medidor no se leyó de verdad. Una lectura real posterior lo corrige.',
  deposit:
    'Un depósito: dinero que se paga por adelantado y se guarda como garantía, por ejemplo por una empresa de servicios públicos o un arrendador. Normalmente se devuelve o se acredita si usted paga a tiempo. En un banco, es dinero que se pone en una cuenta.',
  'medical certificate':
    'Un certificado médico: un formulario firmado por un médico u otro proveedor con licencia que dice que alguien del hogar necesita el servicio público por motivos de salud. Puede retrasar un corte durante un tiempo.',
  'winter moratorium':
    'La moratoria de invierno: una regla de muchos estados que limita o prohíbe los cortes de servicios públicos durante los meses fríos.',
  'public utility commission':
    'La comisión de servicios públicos: la agencia estatal que regula a las empresas de servicios públicos. Recibe quejas de clientes que no logran resolver un problema con su empresa.',

  // Immigration, identity, records
  'receipt notice':
    'Un aviso de recibo: un aviso de la agencia de inmigración que confirma que recibió una solicitud o una petición. Muestra un número de recibo para consultar el caso. No es una aprobación.',
  'request for evidence':
    'Una solicitud de evidencia: una carta de la agencia de inmigración que pide más documentos o información antes de decidir un caso. Tiene un plazo, y no responder puede llevar a una denegación.',
  'biometrics appointment':
    'Una cita de datos biométricos: una cita en la que la agencia de inmigración toma sus huellas dactilares, su fotografía y su firma para verificar su identidad y sus antecedentes.',
  'notice of intent to deny':
    'Una notificación de intención de denegar: una carta que dice que la agencia de inmigración piensa denegar una solicitud y explica por qué. Da un tiempo corto para responder con pruebas antes de que se tome la decisión.',
  'priority date':
    'La fecha de prioridad: la fecha que marca el lugar de una persona en la fila para una visa de inmigrante, normalmente el día en que se presentó la petición.',
  'alien registration number':
    'El número de registro de extranjero: un número de identificación, también llamado número A, que la agencia de inmigración asigna a una persona y usa en los expedientes de esa persona.',
  'certified copy':
    'Una copia certificada: una copia oficial de un documento, como un acta de nacimiento o un documento judicial, emitida y sellada por la oficina que guarda el original.',
  'data breach':
    'Una filtración de datos: un incidente en el que información personal que guardaba una organización fue vista o robada por alguien que no tenía permiso para tenerla.',
  'credit freeze':
    'Un congelamiento de crédito: un bloqueo que usted puede poner, sin costo, en su informe de crédito para que los prestamistas nuevos no puedan verlo. Hace difícil que otra persona abra cuentas a su nombre.',
  'fraud alert':
    'Una alerta de fraude: una nota en su informe de crédito que les dice a los prestamistas que tomen medidas adicionales para confirmar su identidad antes de abrir un crédito nuevo. Es gratuita.',
  'identity theft':
    'El robo de identidad: cuando alguien usa su información personal, como su nombre o su número de Seguro Social, sin permiso, por ejemplo para abrir cuentas o presentar una declaración de impuestos.',

  // Banking, cars, schools, everything else
  overdraft:
    'Un sobregiro: cuando se saca de una cuenta bancaria más dinero del que hay en ella. El banco puede cubrir el pago y cobrar un cargo.',
  'insufficient funds':
    'Fondos insuficientes: no había suficiente dinero en la cuenta para cubrir un pago o un cheque, por lo que fue devuelto sin pagar. Los bancos muchas veces cobran un cargo por esto.',
  'account closure':
    'El cierre de la cuenta: el banco o la empresa está cerrando, o ya cerró, la cuenta. La carta normalmente dice por qué y qué pasa con el dinero que quede en ella.',
  chargeback:
    'Un contracargo: un pago con tarjeta que el banco revirtió después de que el titular de la tarjeta lo disputó. El dinero vuelve al titular y se le quita al vendedor.',
  repossession:
    'La reposesión: cuando un prestamista recupera un bien, normalmente un automóvil, porque no se hicieron los pagos del préstamo.',
  'deficiency balance':
    'El saldo por deficiencia: lo que todavía se debe de un préstamo después de que el bien recuperado o ejecutado se vendió por menos que la deuda.',
  'registration renewal':
    'La renovación del registro: renovar el registro de un vehículo ante el estado para que pueda seguir circulando legalmente. Hay que hacerla periódicamente y tiene un costo.',
  'suspension of license':
    'La suspensión de la licencia: la pérdida temporal del derecho a manejar, o a hacer otro trabajo que requiere licencia. Dura hasta que pasa un tiempo fijo o se cumplen ciertas condiciones.',
  'proof of insurance':
    'El comprobante de seguro: un documento de su aseguradora, como una tarjeta del seguro, que muestra que usted tiene la cobertura exigida.',
  'student loan servicer':
    'El administrador de préstamos estudiantiles: la empresa que le envía las facturas de su préstamo estudiantil, cobra los pagos y gestiona los planes de pago en nombre del prestamista.',
  deferment:
    'Un aplazamiento de pago: un período en el que los pagos de un préstamo se posponen con la aprobación del prestamista. En algunos préstamos los intereses siguen acumulándose durante ese tiempo.',
  'income-driven repayment':
    'El pago basado en los ingresos: un plan federal de préstamos estudiantiles que fija su pago mensual según sus ingresos y el tamaño de su familia, y no según la cantidad que usted debe.',
  'wage withholding order':
    'Una orden de retención de salario: una orden que obliga a un empleador a descontar dinero de la paga de un trabajador y enviarlo a otra persona o entidad, casi siempre para la manutención de menores o para una deuda.',
  'child support order':
    'Una orden de manutención de menores: una orden de un tribunal o de una agencia que dice cuánto debe pagar un padre o una madre para la manutención de un hijo, y cada cuánto.',
  arrears: 'Los atrasos: dinero vencido, es decir, pagos que se debían en el pasado y que no se han hecho.',
  'certified mail':
    'El correo certificado: un servicio postal que le da al remitente un comprobante de envío y un registro de la entrega. Los remitentes lo usan para cartas con plazos legales.',
  postmarked:
    'Con matasellos: sellado por la oficina de correos con la fecha de envío. Cuando algo debe llevar matasellos antes de una fecha límite, lo que cuenta es la fecha de envío, no el día en que llega.',
  'business days':
    'Los días hábiles: los días de lunes a viernes, sin contar los fines de semana y normalmente tampoco los días feriados.',
  'calendar days': 'Los días calendario: todos los días seguidos, incluidos los fines de semana y los días feriados.',
  'effective date':
    'La fecha de vigencia: el día en que un cambio, una decisión, una política o una póliza empieza a aplicarse.',
  'due process':
    'El debido proceso: el derecho a que le informen de una acción en su contra y a tener una oportunidad justa de ser escuchado antes de que sea definitiva.',
  'without prejudice':
    'Sin perjuicio: sin renunciar a ningún derecho. Un caso desestimado sin perjuicio puede presentarse de nuevo, y un pago aceptado sin perjuicio no da por resuelto el asunto.',
};
