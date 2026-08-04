import { of } from 'rxjs';
import { MESSAGE_PATTERNS } from '@app/common';
import { ApiGatewayService } from './api-gateway.service';

describe('ApiGatewayService', () => {
  it('uses the controlled catalog message pattern', async () => {
    const send = jest.fn().mockReturnValue(of([{ id: 1 }]));
    const service = new ApiGatewayService({ send } as never);

    await expect(service.getBookCatalog()).resolves.toEqual([{ id: 1 }]);
    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.books.catalog.get, {});
  });
});
