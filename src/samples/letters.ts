/**
 * Made-up letters for trying the app without a real one. Every organisation,
 * person, account number and phone number below is invented.
 */
export interface SampleLetter {
  id: string;
  title: string;
  text: string;
}

export const SAMPLE_LETTERS: readonly SampleLetter[] = [
  {
    id: 'medical-bill',
    title: 'Hospital bill',
    text: `Riverbend Medical Group
Patient Financial Services
PO Box 4410, Dayton, OH 45401

Statement date: November 20, 2026
Account number: RMG-0042-7719
Patient: Jordan A. Sample

Date of service: 10/02/2026 — Emergency department visit

Total charges:              $1,480.00
Insurance payments:        ($1,034.00)
Contractual adjustment:      ($150.00)
Patient balance:               $296.00

Your insurance has processed this claim. The balance shown is your
responsibility. Please pay $296.00 by December 15, 2026.

If you cannot pay the full amount, call us to set up a payment plan or
to ask about financial assistance. Accounts unpaid 60 days after the
statement date may be referred to a collection agency.

Questions about this bill? Call (800) 555-0199, Monday to Friday,
8 a.m. to 5 p.m.`,
  },
  {
    id: 'eob',
    title: 'Insurance statement that looks like a bill',
    text: `Northlake Health Plan
Member Services, PO Box 9000, Madison, WI 53701

EXPLANATION OF BENEFITS
THIS IS NOT A BILL

Statement date: November 12, 2026
Member: Jordan A. Sample          Member ID: NHP 558 204 113
Claim number: 2026-448812
Provider: Riverbend Medical Group
Date of service: 10/02/2026

Amount billed by provider:      $1,480.00
Plan discount:                    $150.00
Amount your plan paid:          $1,034.00
Deductible applied:               $200.00
Coinsurance:                       $96.00
Amount you may owe provider:      $296.00

This statement shows how your claim was processed. Do not pay from
this statement. Your provider will bill you for any amount you owe.

If you disagree with this decision you may file an appeal within 180
days of the date you received this statement.

Member Services: 1-800-555-0142`,
  },
  {
    id: 'tax-proposed',
    title: 'Tax notice proposing a change',
    text: `Department of the Treasury
Internal Revenue Service
Notice CP2000
Tax year 2025
Notice date: November 9, 2026
Social security number: XXX-XX-0000
AUR control number: 50008-2640

Jordan A. Sample
100 Example Street
Columbus, OH 43004

We are proposing changes to your 2025 Form 1040

The income and payment information we have on file from sources such as
employers or financial institutions does not match the information you
reported on your tax return. If our information is correct, you will owe
$1,214.

Summary of proposed changes
Tax you owe                               $1,070
Substantial tax understatement penalty        $0
Interest charges                            $144
Amount due by December 9, 2026            $1,214

This is not a bill. It is a proposal. You have the right to disagree.

What you need to do
Review this notice and compare our information with your records.
Complete the Response form and send it to us so we receive it by
December 9, 2026, whether you agree or disagree with the changes.

If we do not hear from you by December 9, 2026, we will send you a
Statutory Notice of Deficiency followed by a final bill.

Questions? Call 1-800-555-0177.`,
  },
];
