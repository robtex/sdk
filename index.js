// @ts-check
/**
 * Robtex SDK — Lightweight client for the Robtex API.
 *
 * DNS, IP, AS, Bitcoin, and Lightning Network intelligence.
 * Zero dependencies. Plain ESM JavaScript with JSDoc types.
 * Works in Node (>=20), Deno, Bun, Cloudflare Workers, and browsers.
 *
 * @example
 * ```js
 * import { Robtex } from '@robtex/sdk';
 * const api = new Robtex();
 * const dns = await api.lookupDns({ hostname: 'google.com' });
 * const rep = await api.ipReputation({ ip: '8.8.8.8' });
 * ```
 *
 * @example With API key for higher rate limits
 * ```js
 * const api = new Robtex({ apiKey: 'your-key' });
 * ```
 *
 * @example With RapidAPI key (plans from $19/mo, 50K+ requests)
 * ```js
 * const api = new Robtex({ rapidApiKey: 'your-rapidapi-key' });
 * ```
 */

const SDK_VERSION = '0.3.1';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * SDK configuration options.
 * @typedef {object} RobtexOptions
 * @property {string} [apiKey] API key for higher rate limits via proapi.robtex.com. Optional — works without one.
 * @property {string} [rapidApiKey] RapidAPI key for access via RapidAPI marketplace (plans from $19/mo). See https://rapidapi.com/robtex/api/robtex
 * @property {string} [baseUrl] Base URL override. Auto-selected: freeapi (no key), proapi (apiKey), or RapidAPI (rapidApiKey).
 * @property {typeof globalThis.fetch} [fetch] Custom fetch implementation. Defaults to globalThis.fetch.
 */

/**
 * DNS record from lookup_dns.
 * @typedef {object} DnsRecord
 * @property {string} type
 * @property {string} value
 * @property {number} [ttl]
 * @property {number} [priority]
 */

/**
 * DNS lookup response.
 * @typedef {object} DnsLookupResponse
 * @property {string} status
 * @property {DnsRecord[]} records
 */

/**
 * Passive DNS record.
 * @typedef {object} PdnsRecord
 * @property {string} rrname
 * @property {string} rrdata
 * @property {string} rrtype
 * @property {number} time_first
 * @property {number} time_last
 * @property {number} count
 */

/**
 * IP query response (legacy).
 * @typedef {object} IpQueryResponse
 * @property {string} status
 * @property {string} [city]
 * @property {string} [country]
 * @property {number} [as]
 * @property {string} [asname]
 * @property {string} [whoisdesc]
 * @property {string} [routedesc]
 * @property {string} [bgproute]
 * @property {Array<{o: string, t: number}>} [pas]
 * @property {Array<{o: string, t: number}>} [pash]
 * @property {Array<{o: string, t: number}>} [act]
 * @property {Array<{o: string, t: number}>} [acth]
 */

/**
 * AS query response (legacy).
 * @typedef {object} AsQueryResponse
 * @property {string} status
 * @property {Array<{n: string, inbgp: number}>} [nets]
 */

/**
 * IP reputation response.
 * @typedef {object & {[key: string]: unknown}} IpReputationResponse
 * @property {string} status
 * @property {string} ip
 * @property {number} [listed_count]
 * @property {number} [clean_count]
 * @property {Array<{blocklist: string, listed: boolean, category?: string, description?: string}>} [listings]
 */

/**
 * IP geolocation response.
 * @typedef {object & {[key: string]: unknown}} IpGeolocationResponse
 * @property {string} status
 * @property {string} ip
 * @property {string} [country]
 * @property {string} [countryName]
 * @property {string} [city]
 * @property {number} [lat]
 * @property {number} [lon]
 */

/**
 * Generic API response for endpoints without specific types.
 * @typedef {{status: string, [key: string]: unknown}} ApiResponse
 */

/**
 * Lightning node response.
 * @typedef {{status: string, [key: string]: unknown}} LightningNodeResponse
 */

/**
 * Lightning channel response.
 * @typedef {{status: string, [key: string]: unknown}} LightningChannelResponse
 */

/**
 * Bitcoin transaction response.
 * @typedef {{status: string, [key: string]: unknown}} BitcoinTransactionResponse
 */

/**
 * Bitcoin address response.
 * @typedef {{status: string, [key: string]: unknown}} BitcoinAddressResponse
 */

/**
 * Bitcoin block response.
 * @typedef {{status: string, [key: string]: unknown}} BitcoinBlockResponse
 */

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Standard error thrown on API failures. */
export class RobtexError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {number | null} [retryAfter]
   */
  constructor(message, status, retryAfter = null) {
    super(message);
    /** @type {string} */
    this.name = 'RobtexError';
    /** @type {number} */
    this.status = status;
    /** @type {number | null} */
    this.retryAfter = retryAfter;
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class Robtex {
  /**
   * @param {RobtexOptions} [options]
   */
  constructor(options = {}) {
    /** @type {string | undefined} */
    this.apiKey = options.apiKey;
    /** @type {string | undefined} */
    this.rapidApiKey = options.rapidApiKey;
    /** @type {string} */
    this.baseUrl = options.baseUrl
      ?? (options.rapidApiKey ? 'https://robtex.p.rapidapi.com'
        : options.apiKey ? 'https://proapi.robtex.com'
        : 'https://freeapi.robtex.com');
    /** @type {typeof globalThis.fetch} */
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Low-level: call any endpoint by name with params.
   * @param {string} endpoint
   * @param {Record<string, string | number | boolean>} [params]
   * @returns {Promise<unknown>}
   */
  async call(endpoint, params = {}) {
    const url = new URL(`/${endpoint}`, this.baseUrl);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    if (this.apiKey) url.searchParams.set('key', this.apiKey);

    /** @type {Record<string, string>} */
    const headers = {
      'User-Agent': `@robtex/sdk/${SDK_VERSION}`,
      'X-Robtex-SDK': SDK_VERSION,
    };
    if (this.rapidApiKey) {
      headers['X-RapidAPI-Key'] = this.rapidApiKey;
      headers['X-RapidAPI-Host'] = 'robtex.p.rapidapi.com';
    }

    const res = await this.fetchFn(url.toString(), { headers });

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      throw new RobtexError(
        this.rapidApiKey
          ? 'RapidAPI rate limit exceeded. Check your plan at https://rapidapi.com/robtex/api/robtex'
          : 'Rate limited. Get higher limits at https://rapidapi.com/robtex/api/robtex',
        429,
        retryAfter ? Number(retryAfter) : null,
      );
    }
    if (!res.ok) {
      throw new RobtexError(`API error: ${res.status} ${res.statusText}`, res.status);
    }

    // Some endpoints (pdns) return line-delimited JSON
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/x-ndjson') || ct.includes('text/plain')) {
      const text = await res.text();
      return text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    }

    return res.json();
  }

  // ── DNS ──────────────────────────────────────────────────────────────────

  /**
   * Lookup all DNS records for a hostname.
   * @param {{hostname: string}} params
   * @returns {Promise<DnsLookupResponse>}
   */
  async lookupDns(params) {
    return /** @type {Promise<DnsLookupResponse>} */ (this.call('lookup_dns', params));
  }

  /**
   * Get A records.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async dnsA(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('dns_a', params));
  }

  /**
   * Get AAAA records.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async dnsAAAA(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('dns_aaaa', params));
  }

  /**
   * Get MX records.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async dnsMx(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('dns_mx', params));
  }

  /**
   * Get NS records.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async dnsNs(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('dns_ns', params));
  }

  /**
   * Get TXT records.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async dnsTxt(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('dns_txt', params));
  }

  /**
   * Get CNAME records.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async dnsCname(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('dns_cname', params));
  }

  /**
   * Get SOA record.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async dnsSoa(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('dns_soa', params));
  }

  /**
   * Get PTR record for an IP address.
   * @param {{ip: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async dnsPtr(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('dns_ptr', params));
  }

  // ── Reverse DNS ──────────────────────────────────────────────────────────

  /**
   * Find hostnames using a DNS record value (A/AAAA/MX/NS).
   * @param {{value: string, type?: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async reverseLookupDnsRecords(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('reverse_lookup_dns_records', params));
  }

  /**
   * Find hostnames pointing to an IP.
   * @param {{ip: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async reverseLookupIp(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('reverse_lookup_ip', params));
  }

  /**
   * Find hostnames using a mail server.
   * @param {{mx: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async reverseLookupMx(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('reverse_lookup_mx', params));
  }

  /**
   * Find hostnames using a nameserver.
   * @param {{nameserver: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async reverseLookupNs(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('reverse_lookup_ns', params));
  }

  /**
   * Find hostnames CNAMEd to a target.
   * @param {{target: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async reverseLookupCname(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('reverse_lookup_cname', params));
  }

  // ── Historic Reverse DNS ─────────────────────────────────────────────────

  /**
   * Find hostnames that previously pointed to an IP.
   * @param {{ip: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async historicReverseLookupIp(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('historic_reverse_lookup_ip', params));
  }

  /**
   * Find hostnames that previously used a nameserver.
   * @param {{nameserver: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async historicReverseLookupNs(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('historic_reverse_lookup_ns', params));
  }

  /**
   * Find hostnames that previously used a mail server.
   * @param {{mx: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async historicReverseLookupMx(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('historic_reverse_lookup_mx', params));
  }

  /**
   * Find hostnames that previously CNAMEd to a target.
   * @param {{target: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async historicReverseLookupCname(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('historic_reverse_lookup_cname', params));
  }

  // ── Passive DNS ──────────────────────────────────────────────────────────

  /**
   * Forward passive DNS lookup — domain to records. Returns array of PdnsRecord.
   * @param {{domain: string}} params
   * @returns {Promise<PdnsRecord[]>}
   */
  async pdnsForward(params) {
    return /** @type {Promise<PdnsRecord[]>} */ (this.call('pdns_forward', params));
  }

  /**
   * Reverse passive DNS lookup — value to domains. Returns array of PdnsRecord.
   * @param {{value: string, type?: string}} params
   * @returns {Promise<PdnsRecord[]>}
   */
  async pdnsReverse(params) {
    return /** @type {Promise<PdnsRecord[]>} */ (this.call('pdns_reverse', params));
  }

  /**
   * Historic reverse passive DNS. Returns array of PdnsRecord.
   * @param {{value: string, type?: string}} params
   * @returns {Promise<PdnsRecord[]>}
   */
  async pdnsReverseHistoric(params) {
    return /** @type {Promise<PdnsRecord[]>} */ (this.call('pdns_reverse_historic', params));
  }

  // ── IP ───────────────────────────────────────────────────────────────────

  /**
   * Check IP reputation against 100+ blocklists.
   * @param {{ip: string}} params
   * @returns {Promise<IpReputationResponse>}
   */
  async ipReputation(params) {
    return /** @type {Promise<IpReputationResponse>} */ (this.call('ip_reputation', params));
  }

  /**
   * Get geolocation for an IP address.
   * @param {{ip: string}} params
   * @returns {Promise<IpGeolocationResponse>}
   */
  async ipGeolocation(params) {
    return /** @type {Promise<IpGeolocationResponse>} */ (this.call('ip_geolocation', params));
  }

  /**
   * Get network info (BGP route, ASN) for an IP.
   * @param {{ip: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async ipNetwork(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('ip_network', params));
  }

  /**
   * Map IP to AS number.
   * @param {{ip: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async ipToAsn(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('ip_to_asn', params));
  }

  /**
   * Check IP against threat intelligence blocklists (FireHOL, IPsum, etc).
   * @param {{ip: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async ipBlocklistCheck(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('ip_blocklist_check', params));
  }

  /**
   * Get threat intelligence for an IP (AbuseIPDB, CIRCL BGP ranking, etc).
   * @param {{ip: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async ipThreatIntel(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('ip_threat_intel', params));
  }

  // ── Legacy IP/AS ─────────────────────────────────────────────────────────

  /**
   * Legacy IP query — DNS records, geolocation, and network data.
   * @param {{ip: string}} params
   * @returns {Promise<IpQueryResponse>}
   */
  async ipquery(params) {
    return /** @type {Promise<IpQueryResponse>} */ (this.call('ipquery', params));
  }

  /**
   * Legacy AS query — networks for an AS number.
   * @param {{asn: string | number}} params
   * @returns {Promise<AsQueryResponse>}
   */
  async asquery(params) {
    return /** @type {Promise<AsQueryResponse>} */ (this.call('asquery', params));
  }

  // ── AS / Routing ─────────────────────────────────────────────────────────

  /**
   * Get AS name and organization.
   * @param {{asn: string | number}} params
   * @returns {Promise<ApiResponse>}
   */
  async asInfo(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('as_info', params));
  }

  /**
   * Get announced prefixes for an AS.
   * @param {{asn: string | number}} params
   * @returns {Promise<ApiResponse>}
   */
  async asPrefixes(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('as_prefixes', params));
  }

  /**
   * Lookup AS WHOIS information.
   * @param {{asn: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async lookupAsWhois(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('lookup_as_whois', params));
  }

  // ── Domain ───────────────────────────────────────────────────────────────

  /**
   * Get domain reputation and threat data.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async domainReputation(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('domain_reputation', params));
  }

  /**
   * Get domain popularity ranking (Tranco, Majestic, Umbrella, CrUX).
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async domainRanking(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('domain_ranking', params));
  }

  /**
   * Check domain against DNS blocklists.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async domainBlocklistCheck(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('domain_blocklist_check', params));
  }

  /**
   * Find domains sharing the same IP.
   * @param {{hostname: string, limit?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async domainSharedIp(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('domain_shared_ip', params));
  }

  /**
   * Find domains sharing the same nameservers.
   * @param {{hostname: string, limit?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async domainSharedNs(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('domain_shared_ns', params));
  }

  /**
   * Find domains sharing the same mail server.
   * @param {{hostname: string, limit?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async domainSharedMx(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('domain_shared_mx', params));
  }

  // ── Hostname Utilities ───────────────────────────────────────────────────

  /**
   * Parse hostname into eTLD, domain, subdomain components.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async parseHostname(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('parse_hostname', params));
  }

  /**
   * Check if hostname is a subdomain.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async isSubdomain(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('is_subdomain', params));
  }

  /**
   * Extract registered domain from hostname.
   * @param {{hostname: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async registeredDomain(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('registered_domain', params));
  }

  /**
   * Get TLD information.
   * @param {{tld: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async tldInfo(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('tld_info', params));
  }

  // ── Lightning Network ────────────────────────────────────────────────────

  /**
   * Lookup a Lightning Network node by public key.
   * @param {{pubkey: string}} params
   * @returns {Promise<LightningNodeResponse>}
   */
  async lookupLightningNode(params) {
    return /** @type {Promise<LightningNodeResponse>} */ (this.call('lookup_lightning_node', params));
  }

  /**
   * Lookup a Lightning Network channel by short channel ID.
   * @param {{short_channel_id: string}} params
   * @returns {Promise<LightningChannelResponse>}
   */
  async lookupLightningChannel(params) {
    return /** @type {Promise<LightningChannelResponse>} */ (this.call('lookup_lightning_channel', params));
  }

  /**
   * Get channels for a Lightning node.
   * @param {{pubkey: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async lookupLightningChannelsPerNode(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('lookup_lightning_channels_per_node', params));
  }

  /**
   * Get recommended Lightning peers for a node.
   * @param {{pubkey: string, count?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async getRecommendedLightningPeers(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('get_recommended_lightning_peers', params));
  }

  /**
   * Search Lightning nodes by alias.
   * @param {{alias: string, limit?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async searchLightningNodesByAlias(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('search_lightning_nodes_by_alias', params));
  }

  /**
   * Get most recently opened Lightning channels.
   * @param {{count?: number}} [params]
   * @returns {Promise<ApiResponse>}
   */
  async latestLightningChannels(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('latest_lightning_channels', params ?? {}));
  }

  // ── Bitcoin ──────────────────────────────────────────────────────────────

  /**
   * Look up a Bitcoin transaction by txid.
   * @param {{txid: string}} params
   * @returns {Promise<BitcoinTransactionResponse>}
   */
  async lookupBitcoinTransaction(params) {
    return /** @type {Promise<BitcoinTransactionResponse>} */ (this.call('lookup_bitcoin_transaction', params));
  }

  /**
   * Look up a Bitcoin address.
   * @param {{address: string}} params
   * @returns {Promise<BitcoinAddressResponse>}
   */
  async lookupBitcoinAddress(params) {
    return /** @type {Promise<BitcoinAddressResponse>} */ (this.call('lookup_bitcoin_address', params));
  }

  /**
   * Look up a Bitcoin block by height.
   * @param {{height: number}} params
   * @returns {Promise<BitcoinBlockResponse>}
   */
  async lookupBitcoinBlock(params) {
    return /** @type {Promise<BitcoinBlockResponse>} */ (this.call('lookup_bitcoin_block', params));
  }

  /**
   * List transactions for a Bitcoin address.
   * @param {{address: string, limit?: number, offset?: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async bitcoinAddressTransactions(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('bitcoin_address_transactions', params));
  }

  /**
   * Find which transactions spend the outputs of a given transaction.
   * @param {{txid: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async bitcoinTransactionSpends(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('bitcoin_transaction_spends', params));
  }

  /**
   * Get Bitcoin blockchain statistics over a block range.
   * @param {{start_height: number, end_height: number}} params
   * @returns {Promise<ApiResponse>}
   */
  async bitcoinBlockchainStats(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('bitcoin_blockchain_stats', params));
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  /**
   * Look up MAC address vendor from IEEE OUI database.
   * @param {{mac: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async lookupMac(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('lookup_mac', params));
  }

  /**
   * Verify an email address via SMTP.
   * @param {{email: string}} params
   * @returns {Promise<ApiResponse>}
   */
  async checkEmail(params) {
    return /** @type {Promise<ApiResponse>} */ (this.call('check_email', params));
  }

  /**
   * API health check.
   * @returns {Promise<ApiResponse>}
   */
  async ping() {
    return /** @type {Promise<ApiResponse>} */ (this.call('ping'));
  }
}

export default Robtex;
