# Verification of the navigation and profile update

24 browser regression groups passed in Chromium 141 with desktop and emulated mobile touch contexts. No page JavaScript exceptions were recorded.

Covered: guest/resident/admin navigation; login and profile logout; password eyes and auto-hide; profile contents and dismissal; municipality selection; evacuation registration and map links; directional native page wipes; duplicate username rejection; username/password edits; admin self-renaming and role/session preservation; all 14 municipality pages; cross-tab flood edits/reset without reload; cross-tab admin logout; desktop swipe exclusion; mobile swipe order and endpoints; edge/vertical/table/form exclusions; area-to-menu navigation; mobile profile placement; admin-only swipe destinations; capsule alignment at widths from 320px to 1920px; dark mode/local icons; reduced motion.

The included Node authentication tests also passed, including storage failure rollback and legacy admin migration. Every inline script parsed, all local assets resolved, and every original project file was retained. Original flood data, flood-editor code, and icon assets are unchanged.

A final visual check covers the top profile card, capsule movement, and Main Menu placement at compact desktop sizes. Phone behavior was emulated; physical iOS/Android devices and other browser engines were not verified. Browser-native transitions require browser support and HTTP(S); normal navigation remains available otherwise.
