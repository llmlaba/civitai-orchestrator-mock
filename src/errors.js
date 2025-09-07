import crypto from 'crypto';

// Карта RFC-секций для статусов, которые у нас встречаются
const RFC = {
    400: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
    404: 'https://tools.ietf.org/html/rfc9110#section-15.5.5',
    409: 'https://tools.ietf.org/html/rfc9110#section-15.5.10',
    415: 'https://tools.ietf.org/html/rfc9110#section-15.5.16',
    500: 'https://tools.ietf.org/html/rfc9110#section-15.6.1',
};

// Заголовок traceparent вида: 00-<32hex traceId>-<16hex spanId>-00
export function makeTraceId() {
    const traceId = crypto.randomBytes(16).toString('hex');
    const spanId  = crypto.randomBytes(8).toString('hex');
    return `00-${traceId}-${spanId}-00`;
}

// Базовый конструктор ошибок
export function httpError(status = 500, title, detail) {
    const err = new Error(detail || title || 'Error');
    err.status = status;
    err.title = title;
    err.detail = detail;
    return err;
}

// Удобные шорткаты
export const Errors = {
    BadRequest: (detail) => httpError(400, 'Bad Request', detail),
    NotFound: (detail) => httpError(404, 'Not Found', detail),
    Conflict: (detail) => httpError(409, 'Conflict', detail),
    UnsupportedMediaType: (detail) => httpError(415, 'Unsupported Media Type', detail),
    Internal: (detail) => httpError(500, 'Internal Server Error', detail),
};

// Мидлвар для присвоения traceId каждому запросу (и ответа)
export function attachTraceId(req, res, next) {
    const incoming = req.headers['traceparent'];
    const traceId = typeof incoming === 'string' && incoming.startsWith('00-')
        ? incoming
        : makeTraceId();

    res.setHeader('traceparent', traceId);     // пробрасываем наружу
    res.locals.traceId = traceId;              // используем в обработчике ошибок
    next();
}

// Единый обработчик ошибок → problem+json
export function errorHandler(err, req, res, next) {
    const status = Number(err?.status) || 500;
    const title  = err?.title || (status === 500 ? 'Internal Server Error' : 'Error');
    const type   = RFC[status] || 'https://tools.ietf.org/html/rfc9110';
    const traceId = res.locals.traceId || makeTraceId();

    // Лог в stdout (как просили)
    // Можно добавить detail, stack по желанию
    console.log(`[traceId=${traceId}] ${status} ${title} ${req.method} ${req.originalUrl} :: ${err?.message || ''}`);

    const body = {
        type,
        title,
        status,
        traceId,
        // если хочешь включать подробности — раскомментируй:
        // detail: err?.detail || undefined,
    };

    res
        .status(status)
        .type('application/problem+json')
        .json(body);
}
