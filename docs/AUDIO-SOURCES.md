# Reference audio release boundary

Current test builds use installed device voices through native speech APIs, or
browser speech synthesis in the PWA. Language availability and offline support
depend on the device. The app reports unavailable voices rather than pretending
that a listening question was played.

Temporary Edge Read Aloud synthetic research clips are retained privately, not
included in current builds. We have not verified a redistribution grant for that
route. A discussion on [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5925556/commercial-use-of-edge-read-aloud-voices-via-edge)
is not binding licence permission. This is a conservative release decision, not a
claim that original-text synthetic speech is inherently prohibited.

Future bundled references require a reviewed source, applicable redistribution
terms, a rights manifest and human phonetic auditioning. The build requires
`public/audio/RIGHTS.json` with `redistributionApproved: true`, `source` and
`termsUrl` before copying a public audio manifest. Approval is a reviewed record,
not something a synthesis job may assert about its own output.

Reference generation must never upload user microphone recordings. Synthetic
references and model probes are not evidence of real learner scoring accuracy.
