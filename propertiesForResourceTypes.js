const raml1Parser = require('raml-1-parser');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const RamlParserConstants = require('./RamlParserConstants');

function getCustomProperty(propertyFromRaml) {
    let customProperty = {};

    if (_.isEmpty(propertyFromRaml.property)) return customProperty;

    customProperty = _.assign(customProperty, getCommonProperty(propertyFromRaml));


    switch (_.toLower(propertyFromRaml.property.type)) {
        case 'string':
            return _.assign(customProperty, getStringProperty(propertyFromRaml));
        case 'object':
            return _.assign(customProperty, getObjectProperty(propertyFromRaml));
        case 'array':
            return _.assign(customProperty, getArrayProperty(propertyFromRaml));
        case 'number':
            return _.assign(customProperty, getNumberProperty(propertyFromRaml));
        case 'integer':
            return _.assign(customProperty, getNumberProperty(propertyFromRaml));
        case 'int':
            return _.assign(customProperty, getNumberProperty(propertyFromRaml));
        case 'boolean':
            return _.assign(customProperty, getBooleanProperty(propertyFromRaml));
        case 'double':
            return _.assign(customProperty, getNumberProperty(propertyFromRaml));
        case null:
            return _.assign(customProperty, getNullProperty(propertyFromRaml));
    }
    // console.log(curstomProperty);
    return customProperty;

}

function getNumberProperty(propertyFromRaml) {
    const customProperty = {};

    if (!propertyFromRaml.property) {
        return customProperty;
    }

    const propertyName = propertyFromRaml.propertyName || '';
    const property = propertyFromRaml.property || {};
    const example = propertyFromRaml.example || {};

    // type
    customProperty.type = property.type;

    // default
    if (property.default) {
        customProperty.default = property.default;
    } else if (_.has(example, propertyName)) {
        customProperty.default = example[propertyName];
    } else {
        customProperty.default = 0;
    }

    // format
    if (property.format) {
        customProperty.format = property.format;
    } else if (_.isArray(customProperty.default)) {
        customProperty.formata = 'array';
    } else {
        customProperty.format = 'number';
    }

    // minimum
    if (property.minimum) {
        customProperty.minimum = property.minimum;
    }

    // maximum
    if (property.maximum) {
        customProperty.maximum = property.maximum;
    }

    return customProperty;
}

function getArrayProperty(propertyFromRaml) {
    const customProperty = {};

    if (!propertyFromRaml.property) {
        return customProperty;
    }

    const propertyName = propertyFromRaml.propertyName || '';
    const property = propertyFromRaml.property || {};
    const example = propertyFromRaml.example || {};

    // type
    customProperty.type = 'array';

    // default
    let defaultExamples = [];
    if (!_.isEmpty(property.default)) {
        defaultExamples = property.default;
    } else if (!_.isEmpty(property.items) && !_.isEmpty(property.items.default)) {
        defaultExamples = property.items.default;
    } else if (_.has(example, propertyName)) {
        defaultExamples = example[propertyName];
    }

    // items
    customProperty.items = [];
    _.forEach(defaultExamples, (defaultExample) => {
        let innerPropertyFromRaml = {};
        innerPropertyFromRaml.property = property.items ? _.omit(property.items, 'default') : null;
        innerPropertyFromRaml.property.default = defaultExample;

        customProperty.items.push(getCustomProperty(innerPropertyFromRaml));
    });

    // minItems
    if (propertyFromRaml.minItems) customProperty.minItems = propertyFromRaml.minItems;

    // maxItems
    if (propertyFromRaml.maxItems) customProperty.maxItems = propertyFromRaml.maxItems;

    return customProperty;
}

function getBooleanProperty(propertyFromRaml) {
    let customProperty = {};

    if (!propertyFromRaml.property) {
        return customProperty;
    }

    const propertyName = propertyFromRaml.propertyName || '';
    const property = propertyFromRaml.property || {};
    const example = propertyFromRaml.example || {};

    // type
    customProperty.type = property.type;

    // default
    if (!_.isEmpty(property.default)) {
        customProperty.default = property.default;
    } else if (!_.has(example, propertyName)) {
        customProperty.default = example[propertyName];
    } else {
        customProperty.default = false;
    }

    return customProperty;
}

function getCommonProperty(propertyFromRaml) {
    let customProperty = {};

    if (!propertyFromRaml.property) {
        return customProperty;
    }

    const propertyName = propertyFromRaml.propertyName || '';
    const property = propertyFromRaml.property || {};
    const required = propertyFromRaml.required || [];

    // required
    if (_.indexOf(required, propertyName) >= 0) {
        customProperty.required = true;
    }

    // readOnly
    if (property.readOnly) {
        if (_.isBoolean(property.readOnly)) {
            customProperty.readOnly = property.readOnly;
        } else if (_.isString(property.readOnly)) {
            customProperty.readOnly = _.includes(property.readOnly, 'true') ? true : false;
        }
    } else if (property.description) {
        if (_.includes(_.toLower(property.description), 'readonly')) {
            customProperty.readOnly = true;
        }
    }

    // Description
    customProperty.description = property.description;

    return customProperty;
}

function getObjectProperty(propertyFromRaml) {
    let customProperty = {};

    if (!propertyFromRaml.property) {
        return customProperty;
    }

    const propertyName = propertyFromRaml.propertyName || '';
    const property = propertyFromRaml.property || {};
    const example = propertyFromRaml.example || {};

    // format
    if (property.format) {
        customProperty.format = property.format;
    } else if (_.isArray(example[propertyName])) {
        customProperty.format = 'array';
    } else {
        customProperty.format = 'object';
    }

    // properties
    if (_.has(example, propertyName) && customProperty.format === 'array') {
        if (!customProperty.properties) {
            customProperty.properties = [];
        }
        _.forEach(example[propertyName], (innerPropertyExample) => {
            let innerPropertyResult = {};
            _.forIn(property.properties, (innerProperty, innerPropertyName) => {
                let innerPropertyFromRaml = {};
                innerPropertyFromRaml.propertyName = innerPropertyName;
                innerPropertyFromRaml.property = innerProperty;
                innerPropertyFromRaml.example = innerPropertyExample;

                innerPropertyResult[innerPropertyName] = getCustomProperty(innerPropertyFromRaml);
            });
            customProperty.properties.push(innerPropertyResult);
        });
    } else {
        _.forIn(property.properties, (innerProperty, innerPropertyName) => {
            let innerPropertyFromRaml = {};
            innerPropertyFromRaml.propertyName = innerPropertyName;
            innerPropertyFromRaml.property = innerProperty;

            if (!customProperty.properties) {
                customProperty.properties = {};
            }
            innerPropertyFromRaml.example = example ? example[propertyName] : {};
            customProperty.properties = getCustomProperty(innerPropertyFromRaml);
        });
    }

    // type
    customProperty.type = property.type;

    return customProperty;
}

function getNullProperty(propertyFromRaml) {
    let customProperty = {};

    if (!propertyFromRaml.property) {
        return customProperty;
    }

    const propertyName = propertyFromRaml.propertyName;
    const property = propertyFromRaml.property;
    const example = propertyFromRaml.example || {};

    // enum
    if (property.enum) {
        customProperty.enum = property.enum;
    } else if (example && _.isArray(example[propertyName])) {
        customProperty.enum = example[propertyName];
    }

    // default
    if (property.default) {
        customProperty.default = property.default;
    } else if (example && propertyName && example[propertyName]) {
        customProperty.default = example[propertyName];
    } else {
        customProperty.default = '';
    }
    return customProperty;
}

function getStringProperty(propertyFromRaml) {
    let customProperty = {};

    if (!propertyFromRaml.property) {
        return customProperty;
    }

    const propertyName = propertyFromRaml.propertyName;
    const property = propertyFromRaml.property;
    const example = propertyFromRaml.example || {};

    customProperty.type = property.type;

    // enum
    if (property.enum) {
        customProperty.enum = property.enum;
    } else if (example && _.isArray(example[propertyName])) {
        customProperty.enum = example[propertyName];
    }

    // default
    if (property.default) {
        customProperty.default = property.default;
    } else if (example && propertyName && example[propertyName]) {
        customProperty.default = example[propertyName];
    } else {
        customProperty.default = '';
    }

    // format
    if (property.format) {
        customProperty.format = property.format;
    } else if (property.enum) {
        customProperty.format = 'array';
    } else if (_.isArray(customProperty.default)) {
        curstomProperty.format = 'array';
    } else {
        customProperty.format = 'string';
    }

    return customProperty;
}


function getPropertiesForResourceType(resourceTypeContents) {
    let propertiesForResourceType = {};


    _.forIn(resourceTypeContents, (resourceTypeContent, resourceType) => {
        if (!propertiesForResourceType[resourceType]) propertiesForResourceType[resourceType] = {};

        if (resourceTypeContent.schema) {
            if (resourceTypeContent.schema.definitions || resourceTypeContent.schema.definition) {
                let definitions = resourceTypeContent.schema.definitions;

                // Definitions exist
                if (!definitions) {
                    definitions = resourceTypeContent.schema.definition;
                }

                _.forIn(definitions, (definition, innerRT) => {

                    if (!propertiesForResourceType[resourceType][innerRT]) {
                        propertiesForResourceType[resourceType][innerRT] = {};
                    }

                    if (definition.properties) { // properties exist
                        let properties = definition.properties;

                        _.forIn(properties, (property, propertyName) => {
                            const propertyFromRaml = {};
                            propertyFromRaml.propertyName = propertyName;
                            propertyFromRaml.property = property;
                            propertyFromRaml.required = resourceTypeContent.schema.required;
                            propertyFromRaml.example = resourceTypeContent.example;

                            if(!_.has(resourceTypeContent.example, propertyName)) {
                                console.log(resourceType + ': ' +propertyName +',')
                            }

                            if(resourceType === 'x.com.st.carbonmonoxidedetector') {
                                console.log(resourceTypeContent.example)
                            }


                            if (!propertiesForResourceType[resourceType]) propertiesForResourceType[resourceType] = {};
                            if (!propertiesForResourceType[resourceType][innerRT]) propertiesForResourceType[resourceType][innerRT] = {};
                            propertiesForResourceType[resourceType][innerRT][propertyName] = getCustomProperty(propertyFromRaml);
                        });
                    } else {  // references
                        if (!propertiesForResourceType[resourceType][innerRT]) propertiesForResourceType[resourceType][innerRT] = {};
                        propertiesForResourceType[resourceType][innerRT].references = {};
                        _.forEach(definition.allOf, (references) => {
                            const reference = _.split(_.replace(_.values(references)[0], '.json#', ''), '/');
                            propertiesForResourceType[resourceType][innerRT].references[reference[0]] = reference[2];
                        });
                    }
                });
            } else { // no definition
                if (!propertiesForResourceType.noDefinitions) {
                    result.noDefinitions = [];
                }
                propertiesForResourceType.noDefinitions.push({
                    resourceType,
                    'schema': resourceTypeContent.schema
                });
            }
        } else { // no schema
            if (!propertiesForResourceType.noSchema) {
                propertiesForResourceType.noSchema = [];
            }
            propertiesForResourceType.noSchema.push({
                method,
                rt
            });
        }
    });

    return propertiesForResourceType
}

function getPropertiesForResourceTypes() {

    const parsedJSON = fs.readFileSync(`${__dirname}/resourceTypesFromRaml.json`, 'utf-8');
    const contents = JSON.parse(parsedJSON);
    let result = {};

    _.forIn(contents, (resourceTypeContents, method) => {
        result[method] = getPropertiesForResourceType(resourceTypeContents);
    });

    const resultToJson = JSON.stringify(result);
    fs.writeFile('resourceTypes.json', resultToJson, 'utf8');

}
getPropertiesForResourceTypes();
