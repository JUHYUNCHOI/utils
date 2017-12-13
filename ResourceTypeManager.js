const RamlParserConstatns = require('./RamlParserConstants');
const raml1Parser = require('raml-1-parser');
const jsonlint = require('jsonlint');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');

function getAllResourceTypeNames() {

    const resourceTypeDirectory = path.join(__dirname, RamlParserConstatns.RESOURCE_TYPE_NAME_PATH);
    const resourceTypeFiles = fs.readdirSync(resourceTypeDirectory);

    let resourceTypeNameList = [];

    _.forEach(resourceTypeFiles, (file) => {
        if(path.extname(file) === RamlParserConstatns.RAML_EXT_NAME) {
            resourceTypeNameList.push(path.basename(file,  RamlParserConstatns.RAML_EXT_NAME));
        }
    });
    return resourceTypeNameList;
}


function parseRamlFilesForResourceTypes(resourceType) {
    return new Promise((resolve, reject) => {
        var fName = path.resolve(__dirname,
            `${RamlParserConstatns.RESOURCE_TYPES_PATH}/${resourceType}${RamlParserConstatns.RAML_EXT_NAME}`);

        const regex = /\,(?=\s*?[\}\]])/g;


        // Parse our RAML file with all the dependencies
        raml1Parser.loadApi(fName).then((api) => {
            const parsedResult = {};

            _.forEach(api.allResources(), (resource) => {
                _.forEach(resource.methods(), (method) => {

                    const methodName = _.trim(_.capitalize(method.method()));
                    if (!parsedResult[methodName]) {
                        parsedResult[methodName] = {};
                    }

                    _.forEach(method.responses(), (response) => {
                        if(response && response.code() && response.code().value() === '200') {
                            const bodies = response.body();

                            _.forEach(bodies, (body) => {
                                if(!parsedResult[methodName][resourceType]) {
                                    parsedResult[methodName][resourceType] = {};
                                }

                                if(!_.isEmpty(body.schemaContent())) {
                                    const schemaContent = _.replace(body.schemaContent(), regex, '');
                                    try {
                                        parsedResult[methodName][resourceType].schema = JSON.parse(schemaContent);
                                    } catch (parsingError) {
                                        console.log(`     ${resourceType} -- Method ${methodName} Parsing Error : check schema.`);
                                        jsonlint.parse(schemaContent)
                                    }
                                }

                                if (!_.isEmpty(body.example())) {
                                    const exampleContent = _.replace(body.example().toJSON(), regex, '');
                                    try {
                                        parsedResult[methodName][resourceType].example = JSON.parse(exampleContent);
                                    } catch (parsingError) {
                                        console.log(`     ${resourceType} -- Method ${methodName} Parsing Error : check example.`);
                                        jsonlint.parse(exampleContent);
                                    }
                                }
                            });
                        }
                    });
                });
            });
            resolve(parsedResult);
       }).catch((err) => {
            console.log(resourceType);
            reject(err);
       });
    });
}

function getResourceTypeInfoFromRaml() {
    const allResourceTypeNames = getAllResourceTypeNames();

    const promises = [];
    _.forEach(allResourceTypeNames, (resourceTypeName) => {
        promises.push(parseRamlFilesForResourceTypes(resourceTypeName));
    });

    Promise.all(promises).then((parsedInfosFromRaml) => {
        let resourceTypesInfoFromRaml = {};

        _.forEach(parsedInfosFromRaml, (parsedInfo) => {
            _.forIn(parsedInfo, (content, key) => {
                if(!resourceTypesInfoFromRaml[key]) resourceTypesInfoFromRaml[key] = {};
                resourceTypesInfoFromRaml[key] = _.assign(resourceTypesInfoFromRaml[key], content);
            });
        });

        const rtListInPostMethod = JSON.stringify(resourceTypesInfoFromRaml);

        fs.writeFile(RamlParserConstatns.RESOURCE_TYPES_FROM_RAML, rtListInPostMethod, 'utf8');
    }).catch((err) => {
         console.log(err)
    });

}

getResourceTypeInfoFromRaml();
