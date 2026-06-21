// The web selector and the mobile app use the same hardened checkout creator.
// It authenticates both cookie sessions and Bearer tokens, validates the slot on
// the server, creates one pending booking and returns its immutable booking ID.
export { POST } from "../mobile/create-payment-intent/route";
