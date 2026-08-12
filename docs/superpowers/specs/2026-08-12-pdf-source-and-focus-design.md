# PDF source selection and result focus

## Goal

Keep conversion of the currently open PDF and add conversion of a PDF chosen from the OS file picker. The converted PDF must open as the active tab in the source Chrome window and that window must be focused.

## Current-PDF detection

The popup will retain embedded-PDF detection as the preferred source. When that does not find a URL, it will allow the active HTTP(S) or `file:` tab URL to proceed as an unverified PDF candidate, including extensionless PDF endpoints such as `GetMondaiPdf`.

The existing byte-level PDF header check remains the definitive validation. A normal web page therefore fails with the existing clear "not a PDF" error after fetch instead of being rejected solely because its URL does not end in `.pdf`.

## Local file picker

The popup will expose two explicit actions:

- Convert the PDF detected in the current tab.
- Choose a PDF file, then convert it.

The second action uses a hidden, PDF-only file input, so clicking it opens Finder/Explorer. The selected `File` is read as bytes in the popup and sent to the transform path without relying on `file:` URL permissions. The same byte-level validation and 2-in-1 transform apply.

## Result opening and focus

After transformation, the service worker will create the result tab in the source window, make that tab active, and focus that window. The focus operation is performed after tab creation; failures to focus do not invalidate a successfully created result tab because Chrome or the operating system can deny foreground activation.

## Errors

- A non-PDF selected from the picker reports that the selected file is not a PDF.
- A current page that does not return PDF bytes reports that its response is not a PDF.
- Existing remote permissions and local `file:` URL guidance are retained for URL-based sources.

## Tests

Add regression coverage for extensionless current-tab URLs, local-file byte transformation routing, and the explicit active-tab/focused-window result-opening sequence. Run the complete test suite and production build.
