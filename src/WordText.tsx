/** Course-authored furigana only; no network lookup or invented kanji readings. */
export function WordText({ value, reading }: { value: string; reading?: string }) {
  return reading && /[\p{Script=Han}]/u.test(value)
    ? <ruby>{value}<rp>（</rp><rt>{reading}</rt><rp>）</rp></ruby>
    : <>{value}</>;
}
