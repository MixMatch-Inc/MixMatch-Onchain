# Brand assets

Web: `apps/web/public/logo.svg` and `apps/web/app/icon.svg` (favicon) are the mark; `apps/web/app/opengraph-image.tsx`
renders the social preview at build time. The Create Next App / Turborepo sample SVGs were removed.

Mobile: `apps/mobile/app.json` is named `MixMatch` (slug `mixmatch`). The PNGs in `apps/mobile/assets` (`icon.png`,
`splash-icon.png`, `favicon.png`, `android-icon-*.png`) are **still the Expo defaults**: they are binary files that
need a designer's artwork. Export them from `apps/web/public/logo.svg`:

| File | Size |
|---|---|
| `icon.png` | 1024x1024, no transparency |
| `android-icon-foreground.png` | 1024x1024, mark within the central 66% |
| `android-icon-background.png` | 1024x1024 solid `#4F46E5` |
| `android-icon-monochrome.png` | 1024x1024, white mark on transparent |
| `splash-icon.png` | 1024x1024 |
| `favicon.png` | 48x48 |

Also update the android `adaptiveIcon.backgroundColor` in `app.json` (currently the template `#E6F4FE`) to `#4F46E5`.
