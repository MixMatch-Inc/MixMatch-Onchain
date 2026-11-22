# Payment links and QR payload

Version 1 of the link the app puts in "Receive" QR codes and accepts from the OS (#1405).

```
mixmatch://pay?v=1&to=<G...>&amount=<decimal>&asset=<CODE>&issuer=<G...>&memo=<text>
```

| Parameter | Required | Rule |
| --- | --- | --- |
| `v` | yes | Must be `1`. Other versions are refused, not guessed. |
| `to` | yes | Stellar public key (56 characters, starts with `G`). |
| `amount` | no | Positive decimal, at most 7 decimals. Invalid values are dropped. |
| `asset`, `issuer` | no | Asset code (1-12 alphanumeric) and its issuer; `issuer` is only used with `asset`. |
| `memo` | no | Text memo, cut to 28 characters. |

Also accepted: a SEP-7 `web+stellar:pay?destination=...&amount=...&memo=...` link, and a bare public key
(what older QR codes contain). Anything else, including `https://` links, is ignored.

Implementation: `packages/shared/src/payment-uri.ts` (`buildPaymentUri`, `parsePaymentUri`). The mobile app
registers the `mixmatch` scheme (and a `web+stellar` Android intent filter) in `app.json`; opening a valid
link switches to the Send tab with the destination, amount and memo filled in.

Not covered: universal/app links (`https://` domain verification) need a domain the project controls and
`apple-app-site-association` / `assetlinks.json` files; add `associatedDomains` and an `autoVerify` intent
filter once that domain exists.
