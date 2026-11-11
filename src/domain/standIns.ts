import type { LanguageId } from './languages';
import type { StandIn } from './template';

/**
 * What a template says where the letter did not yield a detail.
 *
 * A gap is never filled with a guess. If no amount was verified, the reader
 * is pointed back to the letter in general words, in the language the
 * guidance is written in. These are fixed phrases written by hand; no model
 * is involved.
 */
const STAND_INS: Record<LanguageId, Record<StandIn, string>> = {
  en: {
    SENDER: 'the sender of your letter',
    REFERENCE: 'the reference number on your letter',
    AMOUNT: 'the amount shown on your letter',
    DEADLINE: 'the date shown on your letter',
    PHONE: 'the phone number on your letter',
  },
  es: {
    SENDER: 'quien le envió la carta',
    REFERENCE: 'el número de referencia de su carta',
    AMOUNT: 'la cantidad que aparece en su carta',
    DEADLINE: 'la fecha que aparece en su carta',
    PHONE: 'el número de teléfono que aparece en su carta',
  },
  'zh-Hans': {
    SENDER: '寄信方',
    REFERENCE: '信上的编号',
    AMOUNT: '信上写的金额',
    DEADLINE: '信上写的日期',
    PHONE: '信上的电话号码',
  },
  'zh-Hant': {
    SENDER: '寄信方',
    REFERENCE: '信上的編號',
    AMOUNT: '信上寫的金額',
    DEADLINE: '信上寫的日期',
    PHONE: '信上的電話號碼',
  },
  vi: {
    SENDER: 'bên gửi thư',
    REFERENCE: 'số tham chiếu ghi trên thư',
    AMOUNT: 'số tiền ghi trên thư',
    DEADLINE: 'ngày ghi trên thư',
    PHONE: 'số điện thoại ghi trên thư',
  },
  tl: {
    SENDER: 'ang nagpadala ng sulat',
    REFERENCE: 'ang reference number na nasa sulat',
    AMOUNT: 'ang halagang nakasaad sa sulat',
    DEADLINE: 'ang petsang nakasaad sa sulat',
    PHONE: 'ang numero ng telepono na nasa sulat',
  },
  ko: {
    SENDER: '편지를 보낸 곳',
    REFERENCE: '편지에 적힌 참조 번호',
    AMOUNT: '편지에 적힌 금액',
    DEADLINE: '편지에 적힌 날짜',
    PHONE: '편지에 적힌 전화번호',
  },
  ar: {
    SENDER: 'الجهة التي أرسلت الرسالة',
    REFERENCE: 'الرقم المرجعي المذكور في الرسالة',
    AMOUNT: 'المبلغ المذكور في الرسالة',
    DEADLINE: 'التاريخ المذكور في الرسالة',
    PHONE: 'رقم الهاتف المذكور في الرسالة',
  },
  ru: {
    SENDER: 'отправитель письма',
    REFERENCE: 'номер, указанный в письме',
    AMOUNT: 'сумма, указанная в письме',
    DEADLINE: 'дата, указанная в письме',
    PHONE: 'номер телефона, указанный в письме',
  },
  ht: {
    SENDER: 'moun ki voye lèt la',
    REFERENCE: 'nimewo referans ki sou lèt la',
    AMOUNT: 'kantite lajan ki sou lèt la',
    DEADLINE: 'dat ki sou lèt la',
    PHONE: 'nimewo telefòn ki sou lèt la',
  },
  pt: {
    SENDER: 'quem enviou a carta',
    REFERENCE: 'o número de referência da carta',
    AMOUNT: 'o valor indicado na carta',
    DEADLINE: 'a data indicada na carta',
    PHONE: 'o número de telefone indicado na carta',
  },
  fr: {
    SENDER: 'l’expéditeur de la lettre',
    REFERENCE: 'le numéro de référence de la lettre',
    AMOUNT: 'le montant indiqué sur la lettre',
    DEADLINE: 'la date indiquée sur la lettre',
    PHONE: 'le numéro de téléphone indiqué sur la lettre',
  },
};

export const standInsFor = (language: LanguageId): Readonly<Record<StandIn, string>> => STAND_INS[language];

/**
 * What a reply shows where the letter did not yield a detail: a blank in
 * square brackets, like the ones left for the reader's own name and address,
 * to be written in by hand. In the reply to send they are in English and in
 * capitals, the way a form marks what is still missing.
 */
const BLANKS_EN: Record<StandIn, string> = {
  SENDER: '[NAME OF THE SENDER]',
  REFERENCE: '[REFERENCE NUMBER ON THE LETTER]',
  AMOUNT: '[AMOUNT ON THE LETTER]',
  DEADLINE: '[DATE ON THE LETTER]',
  PHONE: '[PHONE NUMBER ON THE LETTER]',
};

export function blanksFor(language: LanguageId): Readonly<Record<StandIn, string>> {
  if (language === 'en') return BLANKS_EN;
  const words = STAND_INS[language];
  return {
    SENDER: `[${words.SENDER}]`,
    REFERENCE: `[${words.REFERENCE}]`,
    AMOUNT: `[${words.AMOUNT}]`,
    DEADLINE: `[${words.DEADLINE}]`,
    PHONE: `[${words.PHONE}]`,
  };
}

/**
 * The blank for the reader's own name, as the copy of a reply in their
 * language should write it. A prompt shows it as the example to follow, so
 * that a blank is not left in English in a copy meant for someone who does
 * not read English.
 */
const NAME_BLANKS: Record<LanguageId, string> = {
  en: '[YOUR FULL NAME]',
  es: '[SU NOMBRE COMPLETO]',
  'zh-Hans': '[您的全名]',
  'zh-Hant': '[您的全名]',
  vi: '[HỌ VÀ TÊN CỦA BẠN]',
  tl: '[ANG BUONG PANGALAN MO]',
  ko: '[귀하의 성명]',
  ar: '[اسمك الكامل]',
  ru: '[ВАШЕ ПОЛНОЕ ИМЯ]',
  ht: '[NON KONPLÈ OU]',
  pt: '[SEU NOME COMPLETO]',
  fr: '[VOTRE NOM COMPLET]',
};

export const nameBlank = (language: LanguageId): string => NAME_BLANKS[language];
