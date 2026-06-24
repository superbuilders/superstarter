import { createHash } from "node:crypto"
import { connect, type DetailedPeerCertificate } from "node:tls"
import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"

async function computeOidcThumbprint(host: string): Promise<string> {
	logger.info({ host }, "computing oidc thumbprint via tls handshake")

	return new Promise<string>(function withResolve(resolve, reject) {
		const socket = connect(
			{
				host,
				port: 443,
				servername: host,
				rejectUnauthorized: true
			},
			function onSecureConnect() {
				const leaf = socket.getPeerCertificate(true)
				socket.end()
				const root = walkToRoot(leaf)
				if (!root.raw || root.raw.length === 0) {
					reject(errors.new(`oidc thumbprint root cert has no DER for host ${host}`))
					return
				}
				const hex = createHash("sha1").update(root.raw).digest("hex")
				logger.info({ host, thumbprint: hex }, "resolved oidc provider thumbprint")
				resolve(hex)
			}
		)
		socket.on("error", function onError(err: Error) {
			reject(err)
		})
	})
}

function walkToRoot(cert: DetailedPeerCertificate): DetailedPeerCertificate {
	let current = cert
	while (
		current.issuerCertificate &&
		current.issuerCertificate !== current &&
		current.issuerCertificate.raw
	) {
		current = current.issuerCertificate
	}
	return current
}

export { computeOidcThumbprint }
