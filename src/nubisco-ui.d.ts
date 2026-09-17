// Opts this project into type-checking for @nubisco/ui's globally-registered
// components. They are installed by the plugin in main.ts and never imported,
// so without this reference Vue has no declaration for <NbBadge>, <NbButton>
// and friends: every such tag resolves to `any` and none of their props are
// checked. Requires @nubisco/ui >= 1.56.1, which is the release that emits the
// augmentation under the name Vue actually reads.
/// <reference types="@nubisco/ui/global" />
