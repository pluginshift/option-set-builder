=== Option Set Builder ===
Contributors: pluginshift
Tags: woocommerce, product options, product addons, custom fields, conditional logic
Requires at least: 6.2
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

WooCommerce product options builder — swatches, uploads, conditional logic and formula pricing, with deep cart and checkout integration.

== Description ==

Option Set Builder adds a flexible option-set builder to
any WooCommerce product. Create reusable option sets, assign them to products,
categories, tags, brands, or the whole catalog, and let customers personalise
products with live price updates carried all the way through cart, checkout and
the order.

Build the form once in a React-powered visual builder — drag to reorder fields,
configure each one in an inspector panel, set conditional show/hide logic and
per-choice pricing, then preview it live before publishing.

= Key features =

* 28 field types — text, textarea, email, url, tel, number, checkbox, radio,
  select, toggle, range, date, time, datetime, color picker, color swatch,
  image swatch, file upload, heading, HTML, divider, spacer, section, button
  group, popup, shortcode, linked products and formula.
* Per-choice pricing modes: flat, percentage, per unit, per character,
  per character (no spaces) and per word — plus a formula engine for
  calculated pricing.
* Conditional show/hide logic with a full operator set.
* Reusable option sets assignable to products, categories, tags, brands or the
  whole catalog.
* Visual builder: drag-to-reorder canvas, inspector panels, live preview,
  assignment manager, global styling, analytics and settings.
* Live price updates on the product page, preserved through cart and checkout.
* HPOS-compatible and Cart/Checkout-Blocks-compatible.
* Multi-currency switcher compatibility (14 popular switchers, including Aelia,
  WOOCS, FOX/WPML, YayCurrency, YITH and more) — prices convert correctly.
* Custom font uploads for option styling, stored locally on your own site.
* Per-set analytics: impressions, clicks, add-to-cart and revenue.

== Installation ==

1. Make sure WooCommerce is installed and active.
2. Upload the plugin folder to `/wp-content/plugins/`, or install it from the
   *Plugins > Add New* screen.
3. Activate it through the *Plugins* screen.
4. Open *Product Options* in the admin menu to build your first option set.

== Frequently Asked Questions ==

= Does this plugin require WooCommerce? =

Yes. WooCommerce 7.0 or newer must be installed and active. The plugin declares
WooCommerce as a required plugin and will not run without it.

= Is it compatible with HPOS (High-Performance Order Storage)? =

Yes. Option Set Builder declares compatibility with both HPOS (custom order tables) and
the Cart & Checkout Blocks.

= Where are uploaded files and custom fonts stored? =

All customer file uploads and any custom fonts you add are stored locally in
your site's own uploads directory. Nothing is sent to a third-party storage
service.

= Does the plugin send any usage data off my site? =

No. There is no usage tracking or telemetry. See the *External services*
section below for the single optional WordPress.org call used by the in-app
"recommended plugins" installer.

== External services ==

This plugin connects to the official WordPress.org Plugin API
(https://api.wordpress.org/) in one place only: the optional "install
recommended plugin" action in the admin dashboard. When an administrator
explicitly clicks to install a suggested free plugin, only that plugin's slug
is sent to WordPress.org so it can be fetched and installed — exactly as the
built-in *Plugins > Add New* screen does. No request is made unless an
administrator triggers it.

WordPress.org terms of service and privacy policy:
https://wordpress.org/about/privacy/

The plugin does not contact any other external service and does not transmit
any site, store, or visitor data.

== Changelog ==

= 1.0.0 =
* Initial release.
