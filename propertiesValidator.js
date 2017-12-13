const RamlParserConstants = require('./RamlParserConstants');
const raml1Parser = require('raml-1-parser');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');

function validateProperties() {

    const parsedJSON = fs.readFileSync(`${__dirname}/${RamlParserConstants.RESOURCE_TYPES_FROM_RAML}`, 'utf-8');
    const contents = JSON.parse(parsedJSON);
    const result = {};

    _.forIn(contents, (resourceTypesContent, method) => {
        _.forIn(resourceTypesContent, (content, resourceType) => {

            if (content.schema) {
                if (content.schema.definitions || content.schema.definition) {
                    let definitions = content.schema.definitions;

                    if (!definitions) {
                        definitions = content.schema.definition;
                    }
                    _.forIn(definitions, (definition, innerRT) => {
                        if (definition.properties) {
                            const properties = definition.properties;

                            _.forIn(properties, (property, propertyName) => {
                                const keys = _.keys(property);

                                const customProperty = {};
                                customProperty.method = method;
                                customProperty.resourceType = resourceType;
                                customProperty.innerResourceType = innerRT;
                                customProperty[propertyName] = property;
                                customProperty.required = content.schema.required;
                                customProperty.example = content.example;

                                if (property.type) {
                                    if (!result.types) result.types = {};
                                    const propertyTypeToLower = _.toLower(property.type);
                                    if (!result.types[propertyTypeToLower]) result.types[propertyTypeToLower] = [];

                                    result.types[propertyTypeToLower] = _.union(result.types[propertyTypeToLower], keys);

                                    if (!result.typeProperties) result.typeProperties = {};
                                    if (!result.typeProperties[propertyTypeToLower]) {
                                        result.typeProperties[propertyTypeToLower] = [];
                                    }

                                    result.typeProperties[propertyTypeToLower].push(customProperty);
                                } else { // no Type: It's a wrong raml file
                                    if (!result.noTypes) result.noTypes = [];
                                    result.noTypes.push(customProperty);
                                }
                            });
                        } else { // no Properties
                            if (!result.noProperties) {
                                result.noProperties = [];
                            }
                            result.noProperties.push({
                                method,
                                resourceType,
                                definition
                            });
                        }
                    });
                } else { // no Defition
                    if (!result.noDefinitions) {
                        result.noDefinitions = [];
                    }
                    result.noDefinitions.push({
                        method,
                        resourceType,
                        'schema' : content.schema
                    });
                }
            } else { // No Schema
                if (!result.noSchema) {
                    result.noSchema = [];
                }

                result.noSchema.push({
                    method,
                    rt
                });
            }
        });
    });

    const resultToJson = JSON.stringify(result);
    fs.writeFile(RamlParserConstants.RESOURCE_TYPES_VALIDATE_RESULT, resultToJson, 'utf8');

}

validateProperties();
