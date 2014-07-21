'use strict';

var thing = require('core-util-is'),
    schema = require('./schema'),
    utils = require('./utils');

/**
 * Creates validation middleware for a parameter.
 * @param parameter
 * @returns {checkParameter}
 */
function validator(parameter, model) {
    var coerce, validateModel;

    validateModel = model && map(model);

    if (parameter.type === 'path' || parameter.type === 'query' && parameter.paramType === 'string') {
        coerce = coercion(model);
    }

    return function checkParameter(req, res, next) {
        var param = req.param(parameter.name);

        if (!param && parameter.required) {
            utils.debuglog('required parameter \'%s\' missing.', parameter.name);
            res.statusCode = 400;
            next(new Error('Required parameter \'' + parameter.name + '\' missing.'));
            return;
        }

        if (validateModel) {
            coerce && (param = coerce(param));

            validateModel(param, function (error) {
                if (error) {
                    utils.debuglog('error validating model schema \'%s\' for \'%s\'.', model, parameter.name);
                    res.statusCode = 400;
                    next(new Error(error.message));
                    return;
                }
            });
        }

        next();
    };
}

/**
 * Maps a type to a schema.
 * @param type
 * @returns {validateModel}
 */
function map(type) {
    if (!thing.isObject(type)) {
        type = {
            "type": type
        };
    }

    return function validateModel(model, cb) {
        var result = schema.validateModel(model, type);
        cb(result.valid ? null : result.error);
    };
}

/**
 * TODO: This won't work properly with doubles and longs (yet).
 * Returns a function that coerces a type.
 * @param type
 */
function coercion(type) {
    var fn;

    switch (type) {
        case 'integer':
        case 'float':
        case 'long':
        case 'double':
            fn = Number;
            break;
        case 'byte':
            fn = function (data) {
                return isNaN(data) ? new Buffer(data)[0] : Number(data);
            };
            break;
        case 'boolean':
            fn = Boolean;
            break;
        case 'date':
        case 'dateTime':
            fn = Date.parse;
            break;
    }

    return fn;
}

module.exports = validator;