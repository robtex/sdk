/**
 * Robtex SDK — Lightweight TypeScript client for the Robtex API.
 *
 * DNS, IP, AS, Bitcoin, and Lightning Network intelligence.
 * Zero dependencies. Works in Node, Deno, Bun, Cloudflare Workers, and browsers.
 *
 * @example
 * ```typescript
 * import { Robtex } from '@robtex/sdk';
 * const api = new Robtex();
 * const dns = await api.lookupDns({ hostname: 'google.com' });
 * const rep = await api.ipReputation({ ip: '8.8.8.8' });
 * ```
 *
 * @example With API key for higher rate limits
 * ```typescript
 * const api = new Robtex({ apiKey: 'your-key' });
 * ```
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** SDK configuration options */
export interface RobtexOptions {
  /** API key for higher rate limits. Optional — works without one. */
  apiKey?: string;
  /** Base URL override. Defaults to https://freeapi.robtex.com (or proapi if apiKey set). */
  baseUrl?: string;
  /** Custom fetch implementation. Defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
}

/** Standard error thrown on API failures */
export class RobtexError extends Error {
  status: number;
  retryAfter: number | null;
  constructor(message: string, status: number, retryAfter: number | null = null) {
    super(message);
    this.name = 'RobtexError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

// ─── Response types ──────────────────────────────────────────────────────────

/** DNS record from lookup_dns */
export interface DnsRecord {
  type: string;
  value: string;
  ttl?: number;
  priority?: number;
}

/** DNS lookup response */
export interface DnsLookupResponse {
  status: string;
  records: DnsRecord[];
}

/** Passive DNS record */
export interface PdnsRecord {
  rrname: string;
  rrdata: string;
  rrtype: string;
  time_first: number;
  time_last: number;
  count: number;
}

/** IP query response (legacy) */
export interface IpQueryResponse {
  status: string;
  city?: string;
  country?: string;
  as?: number;
  asname?: string;
  whoisdesc?: string;
  routedesc?: string;
  bgproute?: string;
  pas?: Array<{ o: string; t: number }>;
  pash?: Array<{ o: string; t: number }>;
  act?: Array<{ o: string; t: number }>;
  acth?: Array<{ o: string; t: number }>;
}

/** AS query response (legacy) */
export interface AsQueryResponse {
  status: string;
  nets?: Array<{ n: string; inbgp: number }>;
}

/** IP reputation response */
export interface IpReputationResponse {
  status: string;
  ip: string;
  listed_count?: number;
  clean_count?: number;
  listings?: Array<{
    blocklist: string;
    listed: boolean;
    category?: string;
    description?: string;
  }>;
  [key: string]: unknown;
}

/** IP geolocation response */
export interface IpGeolocationResponse {
  status: string;
  ip: string;
  country?: string;
  countryName?: string;
  city?: string;
  lat?: number;
  lon?: number;
  [key: string]: unknown;
}

/** Generic API response for endpoints without specific types */
export interface ApiResponse {
  status: string;
  [key: string]: unknown;
}

/** Lightning node response */
export interface LightningNodeResponse {
  status: string;
  [key: string]: unknown;
}

/** Lightning channel response */
export interface LightningChannelResponse {
  status: string;
  [key: string]: unknown;
}

/** Bitcoin transaction response */
export interface BitcoinTransactionResponse {
  status: string;
  [key: string]: unknown;
}

/** Bitcoin address response */
export interface BitcoinAddressResponse {
  status: string;
  [key: string]: unknown;
}

/** Bitcoin block response */
export interface BitcoinBlockResponse {
  status: string;
  [key: string]: unknown;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class Robtex {
  private baseUrl: string;
  private apiKey: string | undefined;
  private fetchFn: typeof globalThis.fetch;

  constructor(options: RobtexOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl
      ?? (options.apiKey ? 'https://proapi.robtex.com' : 'https://freeapi.robtex.com');
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** Low-level: call any endpoint by name with params. */
  async call(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<unknown> {
    const url = new URL(`/${endpoint}`, this.baseUrl);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    if (this.apiKey) url.searchParams.set('key', this.apiKey);

    const res = await this.fetchFn(url.toString());

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      throw new RobtexError(
        'Rate limited. Get an API key at https://proapi.robtex.com for higher limits.',
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

  /** Lookup all DNS records for a hostname. */
  async lookupDns(params: { hostname: string }): Promise<DnsLookupResponse> {
    return this.call('lookup_dns', params) as Promise<DnsLookupResponse>;
  }

  /** Get A records. */
  async dnsA(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('dns_a', params) as Promise<ApiResponse>;
  }

  /** Get AAAA records. */
  async dnsAAAA(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('dns_aaaa', params) as Promise<ApiResponse>;
  }

  /** Get MX records. */
  async dnsMx(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('dns_mx', params) as Promise<ApiResponse>;
  }

  /** Get NS records. */
  async dnsNs(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('dns_ns', params) as Promise<ApiResponse>;
  }

  /** Get TXT records. */
  async dnsTxt(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('dns_txt', params) as Promise<ApiResponse>;
  }

  /** Get CNAME records. */
  async dnsCname(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('dns_cname', params) as Promise<ApiResponse>;
  }

  /** Get SOA record. */
  async dnsSoa(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('dns_soa', params) as Promise<ApiResponse>;
  }

  /** Get PTR record for an IP address. */
  async dnsPtr(params: { ip: string }): Promise<ApiResponse> {
    return this.call('dns_ptr', params) as Promise<ApiResponse>;
  }

  // ── Reverse DNS ──────────────────────────────────────────────────────────

  /** Find hostnames using a DNS record value (A/AAAA/MX/NS). */
  async reverseLookupDnsRecords(params: { value: string; type?: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('reverse_lookup_dns_records', params) as Promise<ApiResponse>;
  }

  /** Find hostnames pointing to an IP. */
  async reverseLookupIp(params: { ip: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('reverse_lookup_ip', params) as Promise<ApiResponse>;
  }

  /** Find hostnames using a mail server. */
  async reverseLookupMx(params: { mx: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('reverse_lookup_mx', params) as Promise<ApiResponse>;
  }

  /** Find hostnames using a nameserver. */
  async reverseLookupNs(params: { nameserver: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('reverse_lookup_ns', params) as Promise<ApiResponse>;
  }

  /** Find hostnames CNAMEd to a target. */
  async reverseLookupCname(params: { target: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('reverse_lookup_cname', params) as Promise<ApiResponse>;
  }

  // ── Historic Reverse DNS ─────────────────────────────────────────────────

  /** Find hostnames that previously pointed to an IP. */
  async historicReverseLookupIp(params: { ip: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('historic_reverse_lookup_ip', params) as Promise<ApiResponse>;
  }

  /** Find hostnames that previously used a nameserver. */
  async historicReverseLookupNs(params: { nameserver: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('historic_reverse_lookup_ns', params) as Promise<ApiResponse>;
  }

  /** Find hostnames that previously used a mail server. */
  async historicReverseLookupMx(params: { mx: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('historic_reverse_lookup_mx', params) as Promise<ApiResponse>;
  }

  /** Find hostnames that previously CNAMEd to a target. */
  async historicReverseLookupCname(params: { target: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('historic_reverse_lookup_cname', params) as Promise<ApiResponse>;
  }

  // ── Passive DNS ──────────────────────────────────────────────────────────

  /** Forward passive DNS lookup — domain to records. Returns array of PdnsRecord. */
  async pdnsForward(params: { domain: string }): Promise<PdnsRecord[]> {
    return this.call('pdns_forward', params) as Promise<PdnsRecord[]>;
  }

  /** Reverse passive DNS lookup — value to domains. Returns array of PdnsRecord. */
  async pdnsReverse(params: { value: string; type?: string }): Promise<PdnsRecord[]> {
    return this.call('pdns_reverse', params) as Promise<PdnsRecord[]>;
  }

  /** Historic reverse passive DNS. Returns array of PdnsRecord. */
  async pdnsReverseHistoric(params: { value: string; type?: string }): Promise<PdnsRecord[]> {
    return this.call('pdns_reverse_historic', params) as Promise<PdnsRecord[]>;
  }

  // ── IP ───────────────────────────────────────────────────────────────────

  /** Check IP reputation against 100+ blocklists. */
  async ipReputation(params: { ip: string }): Promise<IpReputationResponse> {
    return this.call('ip_reputation', params) as Promise<IpReputationResponse>;
  }

  /** Get geolocation for an IP address. */
  async ipGeolocation(params: { ip: string }): Promise<IpGeolocationResponse> {
    return this.call('ip_geolocation', params) as Promise<IpGeolocationResponse>;
  }

  /** Get network info (BGP route, ASN) for an IP. */
  async ipNetwork(params: { ip: string }): Promise<ApiResponse> {
    return this.call('ip_network', params) as Promise<ApiResponse>;
  }

  /** Map IP to AS number. */
  async ipToAsn(params: { ip: string }): Promise<ApiResponse> {
    return this.call('ip_to_asn', params) as Promise<ApiResponse>;
  }

  /** Check IP against threat intelligence blocklists (FireHOL, IPsum, etc). */
  async ipBlocklistCheck(params: { ip: string }): Promise<ApiResponse> {
    return this.call('ip_blocklist_check', params) as Promise<ApiResponse>;
  }

  /** Get threat intelligence for an IP (AbuseIPDB, CIRCL BGP ranking, etc). */
  async ipThreatIntel(params: { ip: string }): Promise<ApiResponse> {
    return this.call('ip_threat_intel', params) as Promise<ApiResponse>;
  }

  // ── Legacy IP/AS ─────────────────────────────────────────────────────────

  /** Legacy IP query — DNS records, geolocation, and network data. */
  async ipquery(params: { ip: string }): Promise<IpQueryResponse> {
    return this.call('ipquery', params) as Promise<IpQueryResponse>;
  }

  /** Legacy AS query — networks for an AS number. */
  async asquery(params: { asn: string | number }): Promise<AsQueryResponse> {
    return this.call('asquery', params) as Promise<AsQueryResponse>;
  }

  // ── AS / Routing ─────────────────────────────────────────────────────────

  /** Get AS name and organization. */
  async asInfo(params: { asn: string | number }): Promise<ApiResponse> {
    return this.call('as_info', params) as Promise<ApiResponse>;
  }

  /** Get announced prefixes for an AS. */
  async asPrefixes(params: { asn: string | number }): Promise<ApiResponse> {
    return this.call('as_prefixes', params) as Promise<ApiResponse>;
  }

  /** Lookup AS WHOIS information. */
  async lookupAsWhois(params: { asn: string }): Promise<ApiResponse> {
    return this.call('lookup_as_whois', params) as Promise<ApiResponse>;
  }

  // ── Domain ───────────────────────────────────────────────────────────────

  /** Get domain reputation and threat data. */
  async domainReputation(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('domain_reputation', params) as Promise<ApiResponse>;
  }

  /** Get domain popularity ranking (Tranco, Majestic, Umbrella, CrUX). */
  async domainRanking(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('domain_ranking', params) as Promise<ApiResponse>;
  }

  /** Check domain against DNS blocklists. */
  async domainBlocklistCheck(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('domain_blocklist_check', params) as Promise<ApiResponse>;
  }

  /** Find domains sharing the same IP. */
  async domainSharedIp(params: { hostname: string; limit?: number }): Promise<ApiResponse> {
    return this.call('domain_shared_ip', params) as Promise<ApiResponse>;
  }

  /** Find domains sharing the same nameservers. */
  async domainSharedNs(params: { hostname: string; limit?: number }): Promise<ApiResponse> {
    return this.call('domain_shared_ns', params) as Promise<ApiResponse>;
  }

  /** Find domains sharing the same mail server. */
  async domainSharedMx(params: { hostname: string; limit?: number }): Promise<ApiResponse> {
    return this.call('domain_shared_mx', params) as Promise<ApiResponse>;
  }

  // ── Hostname Utilities ───────────────────────────────────────────────────

  /** Parse hostname into eTLD, domain, subdomain components. */
  async parseHostname(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('parse_hostname', params) as Promise<ApiResponse>;
  }

  /** Check if hostname is a subdomain. */
  async isSubdomain(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('is_subdomain', params) as Promise<ApiResponse>;
  }

  /** Extract registered domain from hostname. */
  async registeredDomain(params: { hostname: string }): Promise<ApiResponse> {
    return this.call('registered_domain', params) as Promise<ApiResponse>;
  }

  /** Get TLD information. */
  async tldInfo(params: { tld: string }): Promise<ApiResponse> {
    return this.call('tld_info', params) as Promise<ApiResponse>;
  }

  // ── Lightning Network ────────────────────────────────────────────────────

  /** Lookup a Lightning Network node by public key. */
  async lookupLightningNode(params: { pubkey: string }): Promise<LightningNodeResponse> {
    return this.call('lookup_lightning_node', params) as Promise<LightningNodeResponse>;
  }

  /** Lookup a Lightning Network channel by short channel ID. */
  async lookupLightningChannel(params: { short_channel_id: string }): Promise<LightningChannelResponse> {
    return this.call('lookup_lightning_channel', params) as Promise<LightningChannelResponse>;
  }

  /** Get channels for a Lightning node. */
  async lookupLightningChannelsPerNode(params: { pubkey: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('lookup_lightning_channels_per_node', params) as Promise<ApiResponse>;
  }

  /** Get recommended Lightning peers for a node. */
  async getRecommendedLightningPeers(params: { pubkey: string; count?: number }): Promise<ApiResponse> {
    return this.call('get_recommended_lightning_peers', params) as Promise<ApiResponse>;
  }

  /** Search Lightning nodes by alias. */
  async searchLightningNodesByAlias(params: { alias: string; limit?: number }): Promise<ApiResponse> {
    return this.call('search_lightning_nodes_by_alias', params) as Promise<ApiResponse>;
  }

  /** Get most recently opened Lightning channels. */
  async latestLightningChannels(params?: { count?: number }): Promise<ApiResponse> {
    return this.call('latest_lightning_channels', params ?? {}) as Promise<ApiResponse>;
  }

  // ── Bitcoin ──────────────────────────────────────────────────────────────

  /** Look up a Bitcoin transaction by txid. */
  async lookupBitcoinTransaction(params: { txid: string }): Promise<BitcoinTransactionResponse> {
    return this.call('lookup_bitcoin_transaction', params) as Promise<BitcoinTransactionResponse>;
  }

  /** Look up a Bitcoin address. */
  async lookupBitcoinAddress(params: { address: string }): Promise<BitcoinAddressResponse> {
    return this.call('lookup_bitcoin_address', params) as Promise<BitcoinAddressResponse>;
  }

  /** Look up a Bitcoin block by height. */
  async lookupBitcoinBlock(params: { height: number }): Promise<BitcoinBlockResponse> {
    return this.call('lookup_bitcoin_block', params) as Promise<BitcoinBlockResponse>;
  }

  /** List transactions for a Bitcoin address. */
  async bitcoinAddressTransactions(params: { address: string; limit?: number; offset?: number }): Promise<ApiResponse> {
    return this.call('bitcoin_address_transactions', params) as Promise<ApiResponse>;
  }

  /** Find which transactions spend the outputs of a given transaction. */
  async bitcoinTransactionSpends(params: { txid: string }): Promise<ApiResponse> {
    return this.call('bitcoin_transaction_spends', params) as Promise<ApiResponse>;
  }

  /** Get Bitcoin blockchain statistics over a block range. */
  async bitcoinBlockchainStats(params: { start_height: number; end_height: number }): Promise<ApiResponse> {
    return this.call('bitcoin_blockchain_stats', params) as Promise<ApiResponse>;
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  /** Look up MAC address vendor from IEEE OUI database. */
  async lookupMac(params: { mac: string }): Promise<ApiResponse> {
    return this.call('lookup_mac', params) as Promise<ApiResponse>;
  }

  /** Verify an email address via SMTP. */
  async checkEmail(params: { email: string }): Promise<ApiResponse> {
    return this.call('check_email', params) as Promise<ApiResponse>;
  }

  /** API health check. */
  async ping(): Promise<ApiResponse> {
    return this.call('ping') as Promise<ApiResponse>;
  }
}

export default Robtex;
