import { mapOrder } from '~/utils/sorts'

describe('mapOrder', () => {
  it('Sort the array according to the order defined in orderArray', () => {
    const columns = [{ _id: 'c2' }, { _id: 'c1' }, { _id: 'c3' }]
    const order = ['c1', 'c2', 'c3']
    const result = mapOrder(columns, order, '_id')
    expect(result.map(c => c._id)).toEqual(['c1', 'c2', 'c3'])
  })

  it('Return an empty array when originalArray, orderArray, or key is falsy', () => {
    expect(mapOrder(null, ['c1'], '_id')).toEqual([])
    expect(mapOrder([{ _id: 'c1' }], null, '_id')).toEqual([])
    expect(mapOrder([{ _id: 'c1' }], ['c1'], null)).toEqual([])
  })

  it('Do not mutate the original array', () => {
    const columns = [{ _id: 'c2' }, { _id: 'c1' }, { _id: 'c3' }]
    const columnOrderIds = columns.map(c => c._id)

    mapOrder(columns, ['c1', 'c2', 'c3'], '_id')

    expect(columns.map(c => c._id)).toEqual(columnOrderIds)
  })

  it('Place items not found in orderArray at the front of the result', () => {
    const columns = [{ _id: 'c1' }, { _id: 'unknown' }, { _id: 'c2' }]
    const order = ['c1', 'c2']
    const result = mapOrder(columns, order, '_id')
    expect(result[0]._id).toBe('unknown')
  })

  it('Return the same single item when originalArray has only one element', () => {
    const columns = [{ _id: 'c1' }]
    const result = mapOrder(columns, ['c1'], '_id')
    expect(result).toEqual([{ _id: 'c1' }])
  })
})