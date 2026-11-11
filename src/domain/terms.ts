/**
 * The glossary: words official letters use that most people never have to
 * know until one arrives, each with what it means in plain English.
 *
 * The list is fixed and ships with the app. When a reader taps a word, the
 * only thing that can be sent anywhere is the *id* of an entry in this list —
 * never a word, phrase or sentence taken from their letter.
 *
 * The meanings are written here, in the repository, and reviewed like code: a
 * wrong one is a bug with a diff. No model writes a meaning. A model is only
 * ever asked to put one of these into another language. (Letting the model in
 * the browser explain a word from memory was tried first. It said a
 * "contractual adjustment" on a hospital bill meant the terms of an agreement
 * were changing, and that "financial assistance" was help with school
 * supplies or a car.)
 *
 * A meaning says what the word generally means and nothing about any letter:
 * no amounts, dates, phone numbers or addresses, and no advice. Where the
 * rule differs by state it says so instead of picking one. When a meaning
 * changes, raise `PROMPT_VERSION` so translations kept on devices are redone.
 */

const ENTRIES = [
  // Money owed, bills, collections
  ['balance due', 'The amount you still owe right now, after any payments already made.'],
  ['past due', 'Not paid by the date it was due. A past-due amount may have late fees added.'],
  ['delinquent', 'Late. An account or a payment is delinquent when it was not paid by its due date.'],
  [
    'minimum payment',
    'The smallest amount you can pay by the due date to keep the account in good standing. Paying only this much usually means the rest keeps growing with interest.',
  ],
  ['late fee', 'An extra charge added because a payment arrived after its due date.'],
  ['finance charge', 'What borrowing costs you, shown as an amount of money: interest plus certain fees.'],
  ['interest', 'Money charged for owing money over time. The longer an amount stays unpaid, the more interest is added.'],
  ['penalty', 'An extra amount charged for being late or for breaking a rule. It is separate from interest.'],
  ['principal', 'The original amount owed, not counting interest or fees.'],
  [
    'statement',
    'A summary of an account for a period of time: what was charged, what was paid and what is still owed. A statement is not always a bill.',
  ],
  ['itemized bill', 'A bill that lists every service or item and its price one by one, instead of only a total. Patients and customers can ask for one.'],
  ['payment plan', 'An agreement to pay what you owe in smaller amounts over time instead of all at once.'],
  ['installment agreement', 'A formal payment plan, often with a tax agency, under which you pay what you owe in monthly amounts.'],
  [
    'hardship',
    'A situation that makes it very difficult to pay, such as losing a job, illness or high medical costs. Many senders have special options for people in hardship, but usually only for those who ask.',
  ],
  [
    'financial assistance',
    'A program that lowers or cancels a bill for people whose income is low. Hospitals often have one, and it usually has to be applied for.',
  ],
  ['charity care', 'Free or reduced-price hospital care for people who cannot afford to pay. It usually has to be applied for, with proof of income.'],
  [
    'collection agency',
    'A company whose business is collecting unpaid debts. It may be working for the company you owed, or it may have bought the debt.',
  ],
  ['debt collector', 'A person or company that collects debts owed to someone else. Federal law limits what a debt collector may say and do.'],
  ['original creditor', 'The company you first owed the money to, before the debt was passed to a collector.'],
  [
    'validation notice',
    'A notice a debt collector must send saying how much it says you owe, who it says you owe it to and how you can dispute the debt.',
  ],
  ['dispute', 'To tell the sender, usually in writing, that you think something is wrong, such as the amount or whether you owe it at all.'],
  [
    'charge-off',
    'When a lender marks a debt in its own books as a loss because it has gone unpaid for a long time. The debt can still be owed, and it can still be collected.',
  ],
  ['settlement', 'An agreement that ends a debt or a dispute, often by paying less than the full amount claimed. It is normally put in writing.'],
  [
    'statute of limitations',
    'The time limit for suing someone. After it runs out, a court case over an old debt can usually be defeated, but the debt itself does not disappear. The limit depends on the state and the kind of debt.',
  ],
  ['credit report', 'A record of your loans, credit cards and payment history, kept by credit bureaus. Lenders, landlords and others look at it.'],
  [
    'credit bureau',
    'A company that collects information about how people pay their debts and sells credit reports. The three large ones are Equifax, Experian and TransUnion.',
  ],
  ['garnishment', 'Money taken straight out of your paycheck or bank account to pay a debt, usually after a court order.'],
  ['levy', 'A legal seizure of your money or property to pay a debt, such as taking money from a bank account.'],
  [
    'lien',
    'A legal claim on your property, such as a house or a car, because of a debt. It can stop you from selling or refinancing until the debt is paid.',
  ],
  ['offset', 'When money you are owed, such as a tax refund or a benefit payment, is kept to pay a debt you owe.'],
  [
    'overpayment',
    'More money paid than was owed. In a benefits letter it usually means the agency says it paid you too much and wants it back. On a bill it means you paid too much.',
  ],
  [
    'waiver',
    'A decision to give up a right or a requirement. For example, an agency may waive a debt or a fee, which means it does not have to be paid. A waiver usually has to be asked for.',
  ],
  [
    'write-off',
    'An amount the sender has decided not to charge or collect. On a medical bill it usually means you are not being asked to pay that part.',
  ],

  // Health care and insurance
  [
    'explanation of benefits',
    'A statement from a health insurer showing what a provider charged, what the plan paid and what you may owe. It is not a bill.',
  ],
  [
    'claim',
    'A request for payment or benefits. In health insurance, it is the request sent to the insurer to pay for care. In other letters it can be a request for benefits or a demand made in court.',
  ],
  ['deductible', 'The amount you pay for covered care each year before your health plan starts to pay.'],
  ['copayment', 'A fixed amount you pay for a visit or a prescription. The plan pays the rest.'],
  ['coinsurance', 'Your share of the cost of covered care, as a percentage, after you have met your deductible.'],
  [
    'out-of-pocket maximum',
    'The most you have to pay for covered care in a year. After you reach it, the plan pays the full cost of covered care for the rest of that year.',
  ],
  ['premium', 'The amount you pay, usually every month, to keep insurance in force, whether or not you use it.'],
  ['allowed amount', 'The most a health plan will pay for a covered service. In-network providers have agreed to accept it as full payment.'],
  ['amount billed', 'The full price a provider charged, before any insurance discount or payment. It is often much more than anyone actually pays.'],
  [
    'contractual adjustment',
    'The part of a provider’s charge that the provider agreed with your insurer not to charge. It is taken off the bill, and you do not owe it.',
  ],
  ['patient responsibility', 'The part of a medical bill that the provider or the insurer says you must pay yourself.'],
  [
    'in-network',
    'Having a contract with your health plan. In-network doctors and hospitals have agreed prices with the plan, so care from them usually costs you less.',
  ],
  [
    'out-of-network',
    'Not having a contract with your health plan. Care from out-of-network providers usually costs you more, and the plan may pay little or nothing.',
  ],
  [
    'balance billing',
    'When a provider bills you for the difference between its charge and what your plan allowed. Federal law bans it in many emergency and surprise-bill situations.',
  ],
  ['prior authorization', 'Approval your health plan requires before it will pay for certain care or medicine. Without it, the plan may refuse to pay.'],
  [
    'medical necessity',
    'A health plan’s judgment about whether care is needed and appropriate for your condition. A plan may refuse to pay for care it decides is not medically necessary, and that decision can be appealed.',
  ],
  ['denial', 'A decision to say no to a claim, an application or a request. A denial letter usually has to say why and how to challenge it.'],
  ['appeal', 'A formal request to have a decision looked at again and changed. Appeals have deadlines, which the letter usually states.'],
  ['internal appeal', 'An appeal to the health plan itself, asking it to review its own decision to deny a claim.'],
  [
    'external review',
    'A review of a health plan’s denial by an independent organization outside the plan, usually available after the internal appeal. The plan must follow the result.',
  ],
  ['grievance', 'A formal complaint. In health plans it is usually about service or how you were treated, not about whether a claim is paid.'],
  [
    'coordination of benefits',
    'The rules that decide which plan pays first when a person is covered by more than one health plan. Insurers sometimes ask about other coverage before they pay a claim.',
  ],
  [
    'subscriber',
    'The person who holds the insurance policy, often the employee whose job provides it. Family members on the plan are listed under the subscriber.',
  ],
  [
    'dependent',
    'A person covered or counted through someone else, such as a child or spouse on a health plan, or someone a taxpayer supports and lists on a tax return.',
  ],
  ['group number', 'The number that identifies the employer or group plan your health insurance comes through. It is on your insurance card.'],
  ['member ID', 'The number that identifies you to your health plan. It is on your insurance card.'],
  [
    'provider',
    'Whoever gave the care or service: a doctor, hospital, clinic or lab. In a utility letter, it is the company that supplies the service.',
  ],
  ['date of service', 'The day you received the care or service being billed, not the day the bill was written.'],
  ['coverage', 'What an insurance plan or benefit program will pay for, and for whom. Having coverage means the plan is in force for you.'],
  ['open enrollment', 'The period each year when you can sign up for health insurance or change plans without needing a special reason.'],
  [
    'special enrollment period',
    'A window to sign up for or change health insurance outside open enrollment, after a life event such as losing other coverage, moving, marrying or having a child.',
  ],
  ['formulary', 'A health plan’s list of the medicines it covers. Medicines not on the list may cost more or not be covered.'],
  ['referral', 'A written order from your main doctor to see a specialist or get a service. Some plans will not pay without one.'],
  [
    'COBRA',
    'A federal law that lets many people keep their employer’s health plan for a limited time after leaving a job or losing coverage, usually by paying the full premium themselves.',
  ],

  // Taxes
  [
    'notice',
    'An official letter that tells you about a decision, a change, a deadline or an amount owed. A notice often starts the clock for responding.',
  ],
  [
    'tax year',
    'The twelve-month period a tax return covers. For most people it is the calendar year, and the return is filed in the spring of the next year.',
  ],
  [
    'adjusted gross income',
    'Your total income for the year minus certain specific adjustments, before the standard or itemized deductions. Many tax rules and benefit limits are based on it.',
  ],
  ['taxable income', 'The part of your income that tax is actually figured on, after deductions are subtracted.'],
  ['withholding', 'Tax that your employer or another payer takes out of your pay and sends to the government for you during the year.'],
  [
    'estimated tax',
    'Tax you pay yourself during the year, usually four times, on income that has no withholding, such as self-employment income.',
  ],
  ['refund', 'Money returned to you because you paid more than you owed.'],
  ['tax credit', 'An amount subtracted directly from the tax you owe. Some credits can be paid to you even if you owe no tax.'],
  [
    'deduction',
    'An amount subtracted from your income before tax is figured, which lowers the tax. On a pay stub it means money taken out of your pay.',
  ],
  [
    'filing status',
    'The category you file your tax return under, such as single, married filing jointly or head of household. It affects your tax rates and deductions.',
  ],
  ['amended return', 'A corrected tax return, filed to fix a mistake in a return that was already filed or to add something to it.'],
  [
    'underreported income',
    'Income that the tax agency’s records show but that it says was missing or too low on your return. The agency compares your return with forms sent in by employers, banks and others.',
  ],
  [
    'proposed assessment',
    'An amount of additional tax the agency intends to charge. It is not final yet: there is usually a set time to agree or disagree.',
  ],
  [
    'notice of deficiency',
    'A formal IRS letter saying it has determined that you owe more tax. It gives you a limited time to challenge the amount in Tax Court before the IRS can bill you for it.',
  ],
  ['failure-to-pay penalty', 'A penalty charged for not paying tax by its due date. It grows each month the tax stays unpaid, up to a limit.'],
  [
    'failure-to-file penalty',
    'A penalty charged for not filing a tax return by its due date. It is usually larger than the penalty for paying late.',
  ],
  [
    'abatement',
    'Removing or reducing a penalty or an amount charged. A penalty can sometimes be abated for a person who had a good reason for being late and asks.',
  ],
  ['offer in compromise', 'An agreement with the tax agency to settle a tax debt for less than the full amount, for people who cannot pay it all.'],
  [
    'currently not collectible',
    'A status the IRS can give an account when the person cannot afford to pay. Collection is paused, but the debt remains and interest keeps being added.',
  ],
  [
    'identity verification',
    'Proving that you are who you say you are, usually by answering questions or showing documents. Agencies ask for it to stop fraud before paying a refund or a benefit.',
  ],
  [
    'taxpayer identification number',
    'The number that identifies you to the tax agency. For most people it is a Social Security number. People who cannot get one use an ITIN, and businesses use an EIN.',
  ],
  [
    'power of attorney',
    'A signed document that lets another person act for you, for example to talk to an agency or sign papers on your behalf.',
  ],
  [
    'Taxpayer Advocate Service',
    'An independent office inside the IRS that helps people, free of charge, when a tax problem is causing hardship or the normal channels have not solved it.',
  ],
  ['audit', 'A review of your return or records to check that what you reported is correct. Many audits are done entirely by mail.'],
  ['examination', 'In a tax letter, another word for an audit: a review of your return and records to check that they are correct.'],
  ['response form', 'The page of a notice that you fill in and send back to say whether you agree or disagree.'],
  [
    'W-2',
    'The form your employer gives you each year showing how much you were paid and how much tax was withheld. A copy also goes to the government.',
  ],
  [
    '1099',
    'A family of forms that report income other than wages, such as freelance pay, interest or unemployment benefits. A copy also goes to the IRS.',
  ],

  // Housing
  ['landlord', 'The owner of a rented home, or the person or company that manages it for the owner.'],
  ['tenant', 'A person who rents and lives in a home owned by someone else.'],
  [
    'lease',
    'The written rental agreement between landlord and tenant. It sets the rent, how long the rental lasts and the rules for both sides.',
  ],
  [
    'month-to-month tenancy',
    'A rental with no fixed end date that continues one month at a time. Either side can end it or change its terms by giving written notice ahead of time, as state law requires.',
  ],
  [
    'security deposit',
    'Money a tenant pays at move-in that the landlord holds in case of unpaid rent or damage. State law sets how and when it must be returned.',
  ],
  [
    'notice to quit',
    'A written notice from a landlord telling a tenant to move out by a certain date. It is a step before an eviction case, not a court order.',
  ],
  [
    'pay or quit',
    'A notice giving a tenant a set number of days to pay overdue rent or move out. If neither happens, the landlord can file an eviction case in court.',
  ],
  ['cure or quit', 'A notice giving a tenant a set number of days to fix a lease violation or move out.'],
  ['notice to vacate', 'A written notice saying a tenant must move out by a certain date. By itself it is not a court order.'],
  [
    'eviction',
    'The legal process a landlord must use to make a tenant leave. It generally requires a court case, and a landlord may not simply lock a tenant out.',
  ],
  ['unlawful detainer', 'The name some states use for an eviction lawsuit.'],
  ['writ of possession', 'A court order, issued after a landlord wins an eviction case, that lets a sheriff or marshal remove the tenant.'],
  [
    'rent increase',
    'A raise in the rent. State and local law set how much written notice the landlord must give, and in some places how large the increase may be.',
  ],
  [
    'renewal',
    'Continuing something for a new period, such as a lease, a benefit or a registration. A renewal often has a deadline and may come with new terms.',
  ],
  [
    'holdover',
    'Staying in a rental after the lease has ended without a new agreement. A holdover tenant can usually be charged rent and can be taken to court to be removed.',
  ],
  [
    'habitability',
    'A rental home’s basic fitness to live in: heat, water, safe wiring, no serious leaks or pests. Landlords are generally required to keep a home habitable.',
  ],
  ['foreclosure', 'The legal process by which a lender takes and sells a home because the mortgage was not paid.'],
  ['default', 'Failing to do what an agreement or a court requires, such as missing loan payments or not answering a lawsuit.'],
  [
    'escrow',
    'Money held by a third party. With a mortgage, it is the account your servicer uses to pay your property taxes and home insurance out of part of your monthly payment.',
  ],
  ['mortgage servicer', 'The company that collects your mortgage payments and manages the loan. It may not be the lender that made the loan.'],
  [
    'reinstatement',
    'Bringing something back into force. For a mortgage, it means paying everything overdue at once to stop a foreclosure. For a license or a policy, it means restoring it after it lapsed.',
  ],
  [
    'loss mitigation',
    'The options a mortgage servicer has for helping a borrower avoid foreclosure, such as a repayment plan, a loan modification or a pause in payments.',
  ],
  ['forbearance', 'A temporary pause or reduction in payments that a lender agrees to. The skipped amounts are still owed later.'],
  ['loan modification', 'A permanent change to the terms of a loan, such as the interest rate or the length, to make the payments affordable.'],

  // Courts and legal process
  [
    'summons',
    'An official notice that you are being sued or must come to court. It states a deadline to respond, and ignoring it can mean losing automatically.',
  ],
  ['complaint', 'The paper that starts a lawsuit. It says who is suing, what they claim happened and what they want from the court.'],
  ['plaintiff', 'The person or company that started the lawsuit.'],
  ['defendant', 'The person or company being sued, or the person charged in a criminal or traffic case.'],
  ['respondent', 'The person who has to answer a petition or an appeal filed by someone else. It is similar to a defendant.'],
  ['petitioner', 'The person who filed a petition asking a court or agency to do something. It is similar to a plaintiff.'],
  [
    'answer',
    'The written response a defendant files with the court to a complaint, saying what they agree with, what they deny and any defenses.',
  ],
  ['served', 'Officially given court papers in a way the law accepts. Deadlines to respond are usually counted from the day of service.'],
  [
    'default judgment',
    'A decision a court makes against someone who did not respond or appear. The other side wins without the court hearing the absent side.',
  ],
  ['judgment', 'The court’s final decision in a case, including who owes what. A money judgment can lead to garnishment or a lien.'],
  ['hearing', 'A scheduled meeting before a judge or hearing officer where each side can speak and present evidence.'],
  ['continuance', 'Moving a hearing or trial to a later date. It has to be asked for and approved by the court.'],
  ['docket number', 'The number a court gives a case to track it. It belongs on everything sent to the court about the case.'],
  ['case number', 'The number a court or agency gives your case or file. It belongs on everything sent about it.'],
  [
    'small claims',
    'A court for disputes over smaller amounts of money, with simpler rules. People usually speak for themselves there, without a lawyer.',
  ],
  ['subpoena', 'An order to appear and testify, or to hand over documents. Ignoring one can be punished by the court.'],
  ['affidavit', 'A written statement of facts that the signer swears is true, usually signed in front of a notary.'],
  [
    'notarized',
    'Signed in front of a notary public, an official who checks your identity and stamps the document to confirm that you signed it.',
  ],
  ['jury duty', 'The obligation to come to court when summoned and be available to serve on a jury.'],
  [
    'juror qualification questionnaire',
    'A form the court sends to find out whether you are eligible to serve on a jury. People who receive it are generally required to fill it in and return it.',
  ],
  ['excusal', 'Being released from jury service, for example because of hardship, illness or caring for someone. It has to be requested from the court.'],
  ['postponement', 'Moving something to a later date. For jury duty, it means serving at a later time instead of the date on the summons.'],
  ['failure to appear', 'Not coming to court on the date you were ordered to. It can lead to a fine, a warrant or a license suspension.'],
  ['bench warrant', 'An order from a judge for a person’s arrest, usually issued because they did not come to court or obey a court order.'],
  [
    'citation',
    'A ticket: a written notice saying you are accused of breaking a law, such as a traffic rule, with instructions to pay or go to court.',
  ],
  [
    'arraignment',
    'The first court appearance in a criminal or traffic case, where the charge is read and the person says whether they plead guilty or not guilty.',
  ],
  ['plea', 'A person’s formal answer to a charge: guilty, not guilty or no contest.'],
  ['traffic school', 'A driving class that a court may let you take so that a ticket is dismissed or does not add points to your record.'],
  [
    'points',
    'Marks added to your driving record for traffic violations. Too many in a set period can raise insurance costs or lead to a suspended license.',
  ],
  ['fee waiver', 'Permission not to pay a court or agency fee because you cannot afford it. It is applied for with a form about your income.'],
  ['legal aid', 'Organizations that give free legal help in civil matters to people with low incomes.'],
  ['pro se', 'Representing yourself in court without a lawyer.'],
  ['mediation', 'A meeting in which a neutral person helps both sides try to reach an agreement. The mediator does not decide who wins.'],
  ['statutory', 'Set by a written law. A statutory deadline or amount is fixed by law, and the sender usually cannot change it.'],

  // Benefits and government programs
  [
    'recertification',
    'The regular check an agency does to confirm you still qualify for a benefit. If the forms are not returned on time, the benefit can stop.',
  ],
  [
    'redetermination',
    'A fresh review of whether you qualify for a benefit or of how much you get. It can be a routine check, or the first level of appeal of a decision.',
  ],
  ['renewal form', 'The form you fill in and return to keep a benefit or coverage going for another period.'],
  ['eligibility', 'Whether you meet the rules to get a benefit or service, such as limits on income, household size or where you live.'],
  [
    'household',
    'The people who are counted together for a benefit, usually those who live together and share income or meals. Each program has its own definition.',
  ],
  ['gross income', 'Income before taxes and other deductions are taken out.'],
  ['net income', 'Income after taxes and deductions are taken out. In benefit programs, it is income after the deductions the program allows.'],
  ['proof of income', 'Documents that show how much money you receive, such as pay stubs, a tax return, an award letter or a letter from an employer.'],
  ['verification', 'Documents or other proof that what you told the agency is true, such as proof of income, identity or address.'],
  [
    'benefit period',
    'The span of time a benefit is approved for, or during which a claim can be paid. When it ends, a new application or recertification may be needed.',
  ],
  [
    'notice of action',
    'An official letter from a benefits agency saying it has approved, denied, changed or stopped your benefits, with the reason and your right to appeal.',
  ],
  [
    'adverse action',
    'A decision that goes against you, such as denying, reducing or stopping a benefit, or turning down an application for credit or a rental.',
  ],
  [
    'fair hearing',
    'A hearing where you can challenge a benefits agency’s decision before an impartial officer. It has to be asked for by the deadline in the notice.',
  ],
  [
    'aid paid pending',
    'Benefits that continue unchanged while an appeal is decided, when the hearing was asked for before the change took effect. If the appeal is lost, they may have to be paid back.',
  ],
  [
    'good cause',
    'An acceptable reason for missing a deadline or not following a rule, such as illness or an emergency. Showing good cause can remove a penalty or reopen a deadline.',
  ],
  ['sanction', 'A penalty for not following a program’s rules, usually a cut or a stop to benefits for a period of time.'],
  ['termination', 'Ending. In a letter it means a benefit, coverage, a service, a lease or a job is being stopped completely.'],
  ['suspension', 'A temporary stop. A suspended benefit, license or service can be restored once certain conditions are met.'],
  ['reduction', 'A decrease in the amount of a benefit or payment.'],
  [
    'overissuance',
    'When an agency gave more benefits, such as SNAP, than the rules allowed. The agency usually asks for the extra to be repaid, even when the mistake was its own.',
  ],
  [
    'Medicaid',
    'Public health insurance for people with low incomes, run by each state with federal money. The program has a different name in some states.',
  ],
  ['Medicare', 'Federal health insurance for people aged sixty-five or older and for some younger people with disabilities.'],
  ['SNAP', 'The Supplemental Nutrition Assistance Program, formerly called food stamps: monthly money for groceries on a benefits card.'],
  [
    'TANF',
    'Temporary Assistance for Needy Families: cash assistance for families with children and very low incomes, with work rules and time limits.',
  ],
  [
    'SSI',
    'Supplemental Security Income: monthly payments from Social Security for people with very low income who are aged, blind or disabled. It is not based on work history.',
  ],
  [
    'SSDI',
    'Social Security Disability Insurance: monthly payments for people who can no longer work because of a disability and who paid into Social Security through earlier work.',
  ],
  ['unemployment insurance', 'Temporary payments from the state for people who lost a job through no fault of their own and are looking for work.'],
  ['claimant', 'The person who filed a claim, for example for unemployment or disability benefits.'],
  [
    'weekly certification',
    'The report filed each week to keep getting unemployment benefits, confirming that you were able to work, that you looked for work and what you earned.',
  ],
  [
    'determination',
    'An agency’s official decision on a claim or a question, such as whether you qualify. It usually comes with a deadline to appeal.',
  ],
  [
    'reconsideration',
    'A request that the agency look at its decision again, often by a different person. It is usually the first step of an appeal.',
  ],
  [
    'representative payee',
    'A person or organization appointed to receive and manage Social Security or SSI payments for someone who cannot manage them alone.',
  ],

  // Utilities
  [
    'disconnection notice',
    'A warning that a utility service will be turned off on or after a stated date unless the overdue amount is paid or an arrangement is made.',
  ],
  ['shutoff', 'Turning off a utility service such as electricity, gas or water, usually for nonpayment.'],
  ['reconnection fee', 'A charge for turning a utility service back on after it was shut off.'],
  ['budget billing', 'A plan that spreads your yearly utility cost into equal monthly payments, so bills do not jump in high-use seasons.'],
  ['meter reading', 'The measurement of how much electricity, gas or water you used, taken from your meter.'],
  ['estimated reading', 'A guess at your usage, based on past bills, used when the meter was not actually read. A later real reading corrects it.'],
  [
    'deposit',
    'Money paid up front and held as security, for example by a utility or a landlord. It is usually returned or credited if you pay on time. In banking, it is money put into an account.',
  ],
  [
    'medical certificate',
    'A form signed by a doctor or other licensed provider saying that someone in the home needs utility service for health reasons. It can delay a shutoff for a time.',
  ],
  ['winter moratorium', 'A rule in many states that limits or bans utility shutoffs during the cold months.'],
  [
    'public utility commission',
    'The state agency that regulates utility companies. It takes complaints from customers who cannot resolve a problem with their utility.',
  ],

  // Immigration, identity, records
  [
    'receipt notice',
    'A notice from the immigration agency confirming that it received an application or petition. It shows a receipt number for checking the case. It is not an approval.',
  ],
  [
    'request for evidence',
    'A letter from the immigration agency asking for more documents or information before it decides a case. It has a deadline, and not answering can lead to a denial.',
  ],
  ['biometrics appointment', 'An appointment where the immigration agency takes your fingerprints, photograph and signature for identity and background checks.'],
  [
    'notice of intent to deny',
    'A letter saying the immigration agency plans to deny an application and explaining why. It gives a short time to respond with evidence before the decision is made.',
  ],
  ['priority date', 'The date that marks a person’s place in line for an immigrant visa, usually the day the petition was filed.'],
  [
    'alien registration number',
    'An identification number, also called an A-number, that the immigration agency assigns to a person and uses on that person’s files.',
  ],
  [
    'certified copy',
    'An official copy of a record, such as a birth certificate or a court document, issued and stamped by the office that keeps the original.',
  ],
  ['data breach', 'An incident in which personal information held by an organization was seen or stolen by someone not allowed to have it.'],
  [
    'credit freeze',
    'A block you can place on your credit report, free of charge, so that new lenders cannot see it. It makes it hard for someone else to open accounts in your name.',
  ],
  [
    'fraud alert',
    'A note on your credit report telling lenders to take extra steps to confirm your identity before opening new credit. It is free.',
  ],
  [
    'identity theft',
    'When someone uses your personal information, such as your name or Social Security number, without permission, for example to open accounts or file a tax return.',
  ],

  // Banking, cars, schools, everything else
  ['overdraft', 'When more money is taken out of a bank account than is in it. The bank may cover the payment and charge a fee.'],
  [
    'insufficient funds',
    'Not enough money in the account to cover a payment or a check, so it was returned unpaid. Banks often charge a fee for this.',
  ],
  [
    'account closure',
    'The bank or company is closing, or has closed, the account. The letter usually says why and what happens to any money left in it.',
  ],
  [
    'chargeback',
    'A card payment reversed by the bank after the cardholder disputed it. The money goes back to the cardholder and is taken from the seller.',
  ],
  ['repossession', 'When a lender takes back property, usually a car, because the loan payments were not made.'],
  ['deficiency balance', 'What is still owed on a loan after repossessed or foreclosed property was sold for less than the debt.'],
  ['registration renewal', 'Renewing a vehicle’s registration with the state so it can legally stay on the road. It is due regularly and has a fee.'],
  [
    'suspension of license',
    'A temporary loss of the right to drive, or to do other work that needs a license. It lasts until a set time passes or certain conditions are met.',
  ],
  ['proof of insurance', 'A document from your insurer, such as an insurance card, showing that you have the required coverage.'],
  [
    'student loan servicer',
    'The company that sends your student loan bills, collects the payments and handles repayment plans on behalf of the lender.',
  ],
  ['deferment', 'A period when loan payments are postponed with the lender’s approval. On some loans interest keeps building during it.'],
  [
    'income-driven repayment',
    'A federal student loan plan that sets your monthly payment by your income and family size instead of by the amount you owe.',
  ],
  [
    'wage withholding order',
    'An order requiring an employer to take money from a worker’s pay and send it to someone else, most often for child support or a debt.',
  ],
  ['child support order', 'A court or agency order saying how much a parent must pay for a child’s support, and how often.'],
  ['arrears', 'Money that is overdue: payments that were owed in the past and have not been made.'],
  [
    'certified mail',
    'A postal service that gives the sender proof of mailing and a record of delivery. Senders use it for letters with legal deadlines.',
  ],
  [
    'postmarked',
    'Stamped by the post office with the date of mailing. When something must be postmarked by a deadline, it is the mailing date that counts, not the day it arrives.',
  ],
  ['business days', 'Weekdays, Monday through Friday, not counting weekends and usually not public holidays.'],
  ['calendar days', 'Every day in a row, including weekends and holidays.'],
  ['effective date', 'The day a change, a decision or a policy starts to apply.'],
  ['due process', 'The right to be told about an action against you and to have a fair chance to be heard before it becomes final.'],
  [
    'without prejudice',
    'Without giving up any rights. A case dismissed without prejudice can be filed again, and a payment accepted without prejudice does not settle the matter.',
  ],
] as const satisfies readonly (readonly [words: string, meaning: string])[];

export type TermId = string & { readonly __term: unique symbol };

export interface Term {
  id: TermId;
  /** The word or phrase as it appears in letters. */
  words: string;
  /** What it generally means, in plain English. Written in this file; no model wrote it. */
  meaning: string;
}

const slug = (words: string): string =>
  words
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const TERMS: readonly Term[] = ENTRIES.map(([words, meaning]) => ({ id: slug(words) as TermId, words, meaning }));

export const TERM_IDS: readonly TermId[] = TERMS.map((t) => t.id);

const BY_ID = new Map<string, Term>(TERMS.map((t) => [t.id, t]));

export const isTermId = (value: unknown): value is TermId => typeof value === 'string' && BY_ID.has(value);

export function term(id: TermId): Term {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown glossary term: ${id}`);
  return found;
}
