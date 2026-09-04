// One-click native share for the comms team's Gallery dashboard — opens each
// platform's own share/composer window pre-filled with the media link (and, where
// the platform's URL scheme actually supports it, a caption). No API keys, no app
// review, no OAuth: the admin still hits "Post" on the platform's own side, same
// as clicking a "Share" button on any other website.
//
// Instagram has no public web share intent at all (only their mobile app's native
// share sheet can post to a feed/story, and only for content already on-device) —
// buildInstagramShare below is a documented workaround, not a real share link.

const encode = (s: string) => encodeURIComponent(s);

export const buildFacebookShareUrl = (mediaUrl: string): string =>
  `https://www.facebook.com/sharer/sharer.php?u=${encode(mediaUrl)}`;

export const buildLinkedInShareUrl = (mediaUrl: string): string =>
  // LinkedIn's share-offsite endpoint only accepts a URL — it deliberately ignores
  // any caption/text parameter to stop pages from putting words in a member's mouth.
  `https://www.linkedin.com/sharing/share-offsite/?url=${encode(mediaUrl)}`;

export const buildXShareUrl = (mediaUrl: string, caption?: string): string =>
  `https://twitter.com/intent/tweet?url=${encode(mediaUrl)}${caption ? `&text=${encode(caption)}` : ''}`;

const SHARE_WINDOW_FEATURES = 'noopener,noreferrer,width=600,height=650';

export const openShareWindow = (url: string): void => {
  window.open(url, '_blank', SHARE_WINDOW_FEATURES);
};
