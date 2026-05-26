type MaybePromise<T> = T | Promise<T>
type Unsubscribe = () => void

/**
 * Messaging library for MV3 extensions.
 *
 * Core concepts:
 * 1) One-shot messaging:
 *    A single request/response interaction over runtime.sendMessage / tabs.sendMessage.
 *
 * 2) Channel messaging:
 *    A long-lived, bidirectional stream over runtime.connect / tabs.connect.
 *
 * 3) Envelope:
 *    The transport wrapper around your payload.
 *    We never send raw payloads directly. Instead we send a structured object
 *    with metadata (message kind, event name, channel name) plus the payload.
 *    This makes routing, versioning, and debugging predictable.
 */

type RuntimeOnMessageListener = Parameters<typeof browser.runtime.onMessage.addListener>[0]
type RuntimeOnConnectListener = Parameters<typeof browser.runtime.onConnect.addListener>[0]
type RuntimeMessageSender = Parameters<RuntimeOnMessageListener>[1]
type RuntimePort = Parameters<RuntimeOnConnectListener>[0]

type ExtensionApi = {
	runtime: typeof browser.runtime
	tabs: typeof browser.tabs
}

const extensionApi = resolveExtensionApi()

export type OneShotEventDefinition = {
	request: unknown
	response: unknown
}

export type OneShotContract = Record<string, OneShotEventDefinition>
export type ChannelEventContract = Record<string, unknown>
export type ChannelContract = Record<string, ChannelEventContract>

/**
 * Canonical Port names for extension contexts.
 *
 * Use `contentScriptPortName(tabId)` for content script channels.
 */
export const CONTEXT_PORT_NAMES = {
	background: 'background',
	popup: 'popup',
	sidepanel: 'sidepanel',
	devtools: 'devtools',
} as const

export type ContextPortName = (typeof CONTEXT_PORT_NAMES)[keyof typeof CONTEXT_PORT_NAMES]
export type ContentScriptPortName = `contentScript@${number}`
export type KnownPortName = ContextPortName | ContentScriptPortName

export function contentScriptPortName(tabId: number): ContentScriptPortName {
	return `contentScript@${tabId}`
}

export function isKnownPortName(name: string): name is KnownPortName {
	if (Object.values(CONTEXT_PORT_NAMES).includes(name as ContextPortName)) {
		return true
	}

	// Migration compatibility: webext-bridge can encode endpoint metadata in
	// port.name as JSON (e.g. {"endpointName":"popup","fingerprint":"..."}).
	// Treat known endpointName values as valid to avoid warning noise.
	if (name.startsWith('{')) {
		try {
			const parsed = JSON.parse(name) as { endpointName?: unknown }
			if (typeof parsed.endpointName === 'string' && Object.values(CONTEXT_PORT_NAMES).includes(parsed.endpointName as ContextPortName)) {
				return true
			}
		}
		catch {
			// Ignore parse failures and continue with standard checks.
		}
	}

	return /^contentScript@\d+$/.test(name)
}

type OneShotRequestEnvelope = {
	__messagingType: 'one-shot'
	event: string
	payload: unknown
}

type OneShotResponseEnvelope = {
	ok: true
	payload: unknown
} | {
	ok: false
	error: { message: string }
}

/**
 * Envelope used for Port communication.
 *
 * channel: Port name used to scope handlers to a specific logical stream.
 * event: Event key inside that stream.
 * payload: User data for the event.
 */
type ChannelEnvelope = {
	__messagingType: 'channel-event'
	channel: string
	event: string
	payload: unknown
}

/**
 * Destination for one-shot request/response messages.
 *
 * Use `{ type: 'runtime' }` when talking to extension contexts through
 * `runtime.sendMessage` (background, popup, sidepanel, options).
 *
 * Use `{ type: 'tab', tabId, frameId? }` when targeting a content script
 * in a specific tab/frame through `tabs.sendMessage`.
 */
export type OneShotTarget =
	| { type: 'runtime' }
	| { type: 'tab', tabId: number, frameId?: number }

/**
 * Destination for long-lived channel (Port) connections.
 *
 * Use `{ type: 'runtime', extensionId? }` to open a runtime Port
 * (`runtime.connect`) to your own extension, or to another extension when
 * `extensionId` is provided.
 *
 * Use `{ type: 'tab', tabId, frameId? }` to open a Port to a content script
 * in a specific tab/frame (`tabs.connect`).
 */
export type ConnectTarget =
	| { type: 'runtime', extensionId?: string }
	| { type: 'tab', tabId: number, frameId?: number }

type OneShotMeta = {
	sender: RuntimeMessageSender
}

export interface Channel<TEvents extends ChannelEventContract> {
	/** Send a typed event over the open Port. */
	send<TEvent extends keyof TEvents>(event: TEvent, payload: TEvents[TEvent]): void
	/** Subscribe to a typed event inside this channel. Returns an unsubscribe function. */
	on<TEvent extends keyof TEvents>(event: TEvent, handler: (payload: TEvents[TEvent]) => void): Unsubscribe
	/** Subscribe to Port disconnection. Useful for UI teardown/reconnect logic. */
	onDisconnect(handler: () => void): Unsubscribe
	/** Explicitly close the underlying Port. */
	disconnect(): void
	/** Read-only connection state for safe checks before sending. */
	isDisconnected(): boolean
}

export interface Messenger<TOneShot extends OneShotContract, TChannels extends ChannelContract> {
	/**
	 * Send a typed one-shot request to runtime or a tab and await its typed response.
	 */
	send<TEvent extends keyof TOneShot>(
		target: OneShotTarget,
		event: TEvent,
		payload: TOneShot[TEvent]['request'],
	): Promise<TOneShot[TEvent]['response']>

	/**
	 * Register a typed one-shot handler.
	 *
	 * Important for MV3:
	 * Native onMessage listeners are wrapped so async responses use sendResponse + return true.
	 */
	on<TEvent extends keyof TOneShot>(
		event: TEvent,
		handler: (payload: TOneShot[TEvent]['request'], meta: OneShotMeta) => MaybePromise<TOneShot[TEvent]['response']>,
	): Unsubscribe

	connect<TChannel extends keyof TChannels>(
		target: ConnectTarget,
		channelName: TChannel,
	): Channel<TChannels[TChannel]>

	/**
	 * Handle incoming Port connections for a specific channel name.
	 */
	onConnect<TChannel extends keyof TChannels>(
		channelName: TChannel,
		handler: (channel: Channel<TChannels[TChannel]>, port: RuntimePort) => void,
	): Unsubscribe

	destroy(): void
}

export type MessengerOptions = {
	logger?: Pick<Console, 'warn' | 'error'>
}

/**
 * Creates a typed messenger instance.
 *
 * Usage guidance for MV3 service workers:
 * Create this at module top-level in your background entrypoint so native
 * listeners are registered synchronously and wake-up events are not missed.
 */
export function createMessenger<
	TOneShot extends OneShotContract,
	TChannels extends ChannelContract,
>(options: MessengerOptions = {}): Messenger<TOneShot, TChannels> {
	const logger = options.logger ?? console

	const oneShotHandlers = new Map<string, Set<(payload: unknown, meta: OneShotMeta) => MaybePromise<unknown>>>()
	const connectHandlers = new Map<string, Set<(port: RuntimePort) => void>>()

	const runtimeOnMessage = (
		message: unknown,
		sender: RuntimeMessageSender,
		sendResponse: (response: OneShotResponseEnvelope) => void,
	) => {
		// Route only one-shot envelopes. Ignore all other runtime traffic.
		const envelope = message as Partial<OneShotRequestEnvelope>
		if (envelope.__messagingType !== 'one-shot' || typeof envelope.event !== 'string') {
			return undefined
		}

		const handlers = oneShotHandlers.get(envelope.event)
    logger.warn(`[messaging] Received one-shot message. Event: ${envelope.event}, Payload:`, envelope.payload, 'Sender:', sender)
    logger.warn(`[messaging] Registered handlers for event ${envelope.event}:`, handlers) // Log handlers to debug missing handler issues
    if (!handlers || handlers.size === 0) {
      logger.warn(`[messaging] No handlers registered for event: ${envelope.event}`)

    }
		if (!handlers || handlers.size === 0) {
			sendResponse({ ok: false, error: { message: `No handler registered for event: ${envelope.event}` } })
			return false
		}

		const handler = [...handlers][handlers.size - 1]

		Promise.resolve(handler(envelope.payload, { sender }))
			.then((result) => sendResponse({ ok: true, payload: result }))
			.catch((error: unknown) => {
				sendResponse({ ok: false, error: { message: toErrorMessage(error) } })
			})

		// Keep sendResponse alive for async handlers (MV3-safe pattern).
		return true
	}

	const runtimeOnConnect = (port: RuntimePort) => {
		// Port name is the channel key. Only invoke handlers registered for this channel.
		if (!isKnownPortName(port.name)) {
			logger.warn('[messaging] Non-standard port name received:', port.name)
		}

		const handlers = connectHandlers.get(port.name)
		if (!handlers || handlers.size === 0) {
			return
		}

		handlers.forEach((handler) => {
			try {
				handler(port)
			}
			catch (error) {
				logger.error('[messaging] onConnect handler crashed', error)
			}
		})
	}

	// Register native listeners synchronously. In service workers, call createMessenger at top-level.
	extensionApi.runtime.onMessage.addListener(runtimeOnMessage)
	// onConnect may exist but still throw "not implemented" in some environments
	// (e.g. @webext-core/fake-browser). Guard registration to keep build/dev stable.
	try {
		extensionApi.runtime.onConnect.addListener(runtimeOnConnect)
	}
	catch (error) {
		logger.warn('[messaging] runtime.onConnect.addListener unavailable; channel listeners disabled in this environment')
	}

	const on = <TEvent extends keyof TOneShot>(
		event: TEvent,
		handler: (payload: TOneShot[TEvent]['request'], meta: OneShotMeta) => MaybePromise<TOneShot[TEvent]['response']>,
	) => {
		const key = String(event)
		const list = oneShotHandlers.get(key) ?? new Set()
		oneShotHandlers.set(key, list)

		const anyHandler = handler as (payload: unknown, meta: OneShotMeta) => MaybePromise<unknown>
		list.add(anyHandler)

		return () => {
			list.delete(anyHandler)
			if (list.size === 0) {
				oneShotHandlers.delete(key)
			}
		}
	}

	const onConnect = <TChannel extends keyof TChannels>(
		channelName: TChannel,
		handler: (channel: Channel<TChannels[TChannel]>, port: RuntimePort) => void,
	) => {
		const key = String(channelName)
		if (!isKnownPortName(key)) {
			logger.warn('[messaging] Registering onConnect with non-standard port name:', key)
		}

		const list = connectHandlers.get(key) ?? new Set()
		connectHandlers.set(key, list)

		const wrapped = (port: RuntimePort) => {
			const channel = createChannelFromPort<TChannels[TChannel]>(port)
			handler(channel, port)
		}

		list.add(wrapped)

		return () => {
			list.delete(wrapped)
			if (list.size === 0) {
				connectHandlers.delete(key)
			}
		}
	}

	const send = async <TEvent extends keyof TOneShot>(
		target: OneShotTarget,
		event: TEvent,
		payload: TOneShot[TEvent]['request'],
	): Promise<TOneShot[TEvent]['response']> => {
		const envelope: OneShotRequestEnvelope = {
			__messagingType: 'one-shot',
			event: String(event),
			payload,
		}

		console.info(`[messaging] Sending one-shot message to ${target.type} target. Event: ${String(event)}, Payload:`, payload)
    console.info(`[messaging] Target details:`, target)
    console.info(`[messaging] Envelope:`, envelope)
		const rawResponse = target.type === 'runtime'
			? await extensionApi.runtime.sendMessage(envelope)
			: await extensionApi.tabs.sendMessage(target.tabId, envelope, { frameId: target.frameId })

		const response = rawResponse as OneShotResponseEnvelope | undefined
		if (!response) {
			throw new Error(`No response for event: ${String(event)}`)
		}

		if (!response.ok) {
			throw new Error(response.error.message)
		}

		return response.payload as TOneShot[TEvent]['response']
	}

	const connect = <TChannel extends keyof TChannels>(
		target: ConnectTarget,
		channelName: TChannel,
	): Channel<TChannels[TChannel]> => {
		const name = String(channelName)
		if (!isKnownPortName(name)) {
			logger.warn('[messaging] Opening connection with non-standard port name:', name)
		}

		const runtime = extensionApi.runtime as any
		const port = target.type === 'runtime'
			? (target.extensionId ? runtime.connect(target.extensionId, { name }) : runtime.connect({ name }))
			: extensionApi.tabs.connect(target.tabId, { name, frameId: target.frameId })

		return createChannelFromPort<TChannels[TChannel]>(port)
	}

	const destroy = () => {
		oneShotHandlers.clear()
		connectHandlers.clear()
		extensionApi.runtime.onMessage.removeListener(runtimeOnMessage)
		try {
			extensionApi.runtime.onConnect.removeListener(runtimeOnConnect)
		}
		catch {
			// noop: onConnect can be unimplemented in fake-browser environments.
		}
	}

	return {
		send,
		on,
		connect,
		onConnect,
		destroy,
	}
}

function createChannelFromPort<TEvents extends ChannelEventContract>(port: RuntimePort): Channel<TEvents> {
	// Event handlers scoped to this one Port/channel instance.
	const eventHandlers = new Map<string, Set<(payload: unknown) => void>>()
	const disconnectHandlers = new Set<() => void>()
	let disconnected = false

	const portMessageListener = (raw: unknown) => {
		// Route only channel envelopes for this Port name.
		const message = raw as Partial<ChannelEnvelope>
		if (message.__messagingType !== 'channel-event') {
			return
		}

		if (message.channel !== port.name || typeof message.event !== 'string') {
			return
		}

		const handlers = eventHandlers.get(message.event)
		if (!handlers || handlers.size === 0) {
			return
		}

		handlers.forEach((handler) => handler(message.payload))
	}

	const portDisconnectListener = () => {
		disconnected = true
		// Notify listeners, then release references to avoid leaks in UI contexts.
		disconnectHandlers.forEach((handler) => handler())
		eventHandlers.clear()
		disconnectHandlers.clear()
		port.onMessage.removeListener(portMessageListener)
		port.onDisconnect.removeListener(portDisconnectListener)
	}

	port.onMessage.addListener(portMessageListener)
	port.onDisconnect.addListener(portDisconnectListener)

	return {
		send<TEvent extends keyof TEvents>(event: TEvent, payload: TEvents[TEvent]) {
			if (disconnected) {
				throw new Error(`Channel ${port.name} is disconnected`)
			}

			port.postMessage({
				__messagingType: 'channel-event',
				channel: port.name,
				event: String(event),
				payload,
			} satisfies ChannelEnvelope)
		},

		on<TEvent extends keyof TEvents>(event: TEvent, handler: (payload: TEvents[TEvent]) => void) {
			const key = String(event)
			const list = eventHandlers.get(key) ?? new Set()
			eventHandlers.set(key, list)

			const anyHandler = handler as (payload: unknown) => void
			list.add(anyHandler)

			return () => {
				list.delete(anyHandler)
				if (list.size === 0) {
					eventHandlers.delete(key)
				}
			}
		},

		onDisconnect(handler: () => void) {
			disconnectHandlers.add(handler)
			return () => {
				disconnectHandlers.delete(handler)
			}
		},

		disconnect() {
			if (disconnected) {
				return
			}
			port.disconnect()
		},

		isDisconnected() {
			return disconnected
		},
	}
}

function resolveExtensionApi(): ExtensionApi {
	// Prefer chrome.* when available; fallback keeps typings/runtime ergonomic in non-chrome globals.
	const chromeApi = (globalThis as any).chrome as ExtensionApi | undefined
	if (chromeApi?.runtime && chromeApi?.tabs) {
		return chromeApi
	}

	return {
		runtime: browser.runtime,
		tabs: browser.tabs,
	}
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}

	if (typeof error === 'string') {
		return error
	}

	return 'Unknown messaging error'
}
