import request from 'superagent'
import { tryUnconfidentialAddress, isHash256 } from '../util'
import { Observable as O } from '../rxjs'

const reNumber  = /^\d+$/
    , reAddr = /^([a-km-zA-HJ-NP-Z1-9]{26,35}|[a-km-zA-HJ-NP-Z1-9]{80}|[a-z]{2,5}1[ac-hj-np-z02-9]{8,87})$/ // very loose regex, might have false positive
    , trim = s => s.trim()
    , stripUri = s => s.replace(/^bitcoin:([^?]+).*/, '$1')

export default apiBase => {
  const tryResource = path =>
    request(apiBase + path)
      .then(r => r.ok ? path : Promise.reject('invalid status'))

  // Accepts a stream of query strings, returns a stream of found resource paths
  return query$ =>
    O.from(query$).map(trim).map(stripUri).flatMap(async query =>

    // if its a number, assume its a block height without checking
      reNumber.test(query)
    ? `/block-height/${query}`

    // if its a 256 bit hash, look it up as a txid or block hash
    : isHash256(query)
    ? tryResource(`/tx/${query}`)
        .catch(_ => tryResource(`/block/${query}`))
        .catch(_ => process.env.ISSUED_ASSETS ? tryResource(`/asset/${query}`) : null)
        .catch(_ => null)

    // lookup as address if it resembles one
    : reAddr.test(query)
    ? tryResource(`/address/${tryUnconfidentialAddress(query)}`)
        .catch(_ => null)

    // @XXX the tx/block/addr resource will be fetched again later for display,
    // which is somewhat wasteful but not terribly so due to browser caching.

    : null
    ).share()
}
