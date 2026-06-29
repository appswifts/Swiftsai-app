import { Agent } from 'undici';
import dns from 'node:dns';
import net from 'node:net';
import { isBlockedIp } from './webhook.url.validator';

export const ssrfSafeDispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      if (net.isIP(hostname)) {
        const family = net.isIP(hostname);
        if (isBlockedIp(hostname)) {
          return callback(new Error('Blocked IP'), '', 0);
        }
        return options && (options as any).all
          ? callback(null, [{ address: hostname, family }] as any, family)
          : callback(null, hostname, family);
      }

      dns.lookup(hostname, options, (err, address: any, family: any) => {
        if (err) return callback(err, '', 0);
        if (Array.isArray(address)) {
          for (const entry of address) {
            if (isBlockedIp(entry.address)) {
              return callback(new Error('Blocked IP'), '', 0);
            }
          }
          return callback(null, address as any, 0);
        }
        if (isBlockedIp(address)) {
          return callback(new Error('Blocked IP'), '', 0);
        }
        callback(null, address, family);
      });
    },
  },
});

export function getSsrfSafeDispatcher(): Agent | undefined {
  return process.env.DISABLE_SSRF_PROTECTION === 'true'
    ? undefined
    : ssrfSafeDispatcher;
}
