const fetcher = jest.fn()
jest.mock('../lib/fetch', () => ({ fetch: fetcher }))

import { createSuccess } from './test-helpers/factories'
import { version } from '../../package.json'
import { Analytics } from '..'
import { resolveCtx } from './test-helpers/resolve-ctx'
import { createTestAnalytics } from './test-helpers/create-test-analytics'
import { isValidDate } from './test-helpers/is-valid-date'

describe('Analytics Node', () => {
  let ajs: Analytics

  beforeEach(async () => {
    fetcher.mockReturnValue(createSuccess())

    ajs = createTestAnalytics()
  })

  test(`Fires an "identify" request with the expected data`, async () => {
    ajs.identify({ userId: 'my_user_id', traits: { foo: 'bar' } })
    await resolveCtx(ajs, 'identify')
    const calls = fetcher.mock.calls
    expect(calls.length).toBe(1)
    const call1 = calls[0]
    const [url, httpRes] = call1
    expect(httpRes.method).toBe('POST')
    expect(url).toBe('https://api.segment.io/v1/batch')
    expect(httpRes.headers).toMatchInlineSnapshot(
      {
        Authorization: expect.stringContaining('Basic'),
        'User-Agent': expect.stringContaining('analytics-node-next'),
      },
      `
      Object {
        "Authorization": StringContaining "Basic",
        "Content-Type": "application/json",
        "User-Agent": StringContaining "analytics-node-next",
      }
    `
    )
    const body = JSON.parse(httpRes.body)

    expect(body).toMatchInlineSnapshot(
      {
        batch: [
          {
            messageId: expect.any(String),
            context: {
              library: {
                version: expect.any(String),
              },
            },

            _metadata: {
              nodeVersion: expect.any(String),
            },
            timestamp: expect.any(String),
          },
        ],
      },
      `
      Object {
        "batch": Array [
          Object {
            "_metadata": Object {
              "nodeVersion": Any<String>,
            },
            "context": Object {
              "library": Object {
                "name": "AnalyticsNode",
                "version": Any<String>,
              },
            },
            "integrations": Object {},
            "messageId": Any<String>,
            "timestamp": Any<String>,
            "traits": Object {
              "foo": "bar",
            },
            "type": "identify",
            "userId": "my_user_id",
          },
        ],
      }
    `
    )

    const event = body.batch[0]
    expect(event.context.library.version).toBe(version)
    expect(isValidDate(event.timestamp)).toBeTruthy()
  })

  test('Track: Fires http requests to the correct endoint', async () => {
    ajs.track({ event: 'foo', userId: 'foo' })
    ajs.track({ event: 'bar', userId: 'foo', properties: { foo: 'bar' } })
    await resolveCtx(ajs, 'track')
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.segment.io/v1/batch',
      expect.anything()
    )
  })

  test('Page: Fires http requests to the correct endoint', async () => {
    ajs.page({ name: 'page', anonymousId: 'foo' })
    await resolveCtx(ajs, 'page')
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.segment.io/v1/batch',
      expect.anything()
    )
  })

  test('Group: Fires http requests to the correct endoint', async () => {
    ajs.group({ groupId: 'group', anonymousId: 'foo' })
    await resolveCtx(ajs, 'group')
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.segment.io/v1/batch',
      expect.anything()
    )
  })

  test('Alias: Fires http requests to the correct endoint', async () => {
    ajs.alias({ userId: 'alias', previousId: 'previous' })
    await resolveCtx(ajs, 'alias')
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.segment.io/v1/batch',
      expect.anything()
    )
  })

  test('Screen', async () => {
    ajs.screen({ name: 'screen', anonymousId: 'foo' })
    await resolveCtx(ajs, 'screen')
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.segment.io/v1/batch',
      expect.anything()
    )
  })
})