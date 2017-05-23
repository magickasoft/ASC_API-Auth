# ASC Identity microservice

This is the repo for the Identity microservice

## Files & Folders

### Source code

The server setup and configuration logic are in the `server` and `config` folders. The `routes` folder contains micro-service business logic, while `models` contains the setup and low-level business code for data (such as validation, data mangling and so on...). The `containers` folder contains the Docker scripts.

### API definitions

The `swagger` folder contains the documentation for API and models . Inside, API definitions are in the `api` folder. The `models` folder contains the collections' models, used to define the MongoDB collections or API response.  The `forms` folder contains the models used for data input.

## Code usage notes

### Setup

#### Get dependencies:

        $ npm install

#### Configure the microservice
The microservice uses [environment variables](https://nodejs.org/api/process.html#process_process_env) for configuration purpose. `config/config.js` exposes the environment variables used by the code.

Local variable definitions (e.g. in  bash `$ export APP_HOST=127.0.0.1`) or Docker ENV (e.g. `ENV JWT_SECRET="secret"`) should be used to set the values correctly.

For initial usage, a set of data and a seeder are contained into the `tools` folder. Please, use `npm run data:seed` to load this data. This command uses the same configuration of the microservice.

### Start the microservice

#### Local usage:

        $ ENV_VARIABLES=env_values npm start

#### Docker:
In the `container` folder a bunch of scripts are used to setup and run a Docker container (Docker must be installed and running).

- Build the container :
        $ ./container/setup.sh
- Run the container :
        $ ./container/run.sh

### Use the microservice
The microservice exposes its functionalities through a set of API (see below).

Use `curl`, `resty`, [Postman](http://www.getpostman.com/) or such to play with the API through the configured APP_PORT and address.

### Unit testing

- To run available unit tests for microservice business logic (no integration/API):
        $ npm run test
- To test only the Swagger documentation:
        $ npm run api:test

## API preview
The [online swagger editor](http://editor.swagger.io) could be used to get a preview of the API. The editor expects a bundle (a file with any $ref resolved) copy of the API.
The following command could be used to bundle an API:
        $ npm run api:bundle -- api/<apiname>.yaml <bundlename>.json
When ready, open the bundle file and copy its content. Then, on the online swagger editor, select `File -> Paste JSON...` and paste the content into the modal window. Press `Import` to load the definitions. If the API server is available, the right pane could be used also to preview the server response.

## Some SWAGGER tools

- `swagger-cli`
        $ npm install -g swagger-cli
- Validate a definition, e.g.:
        $ swagger validate swagger/api/<apiname>.yaml
- Resolve any `$ref` in a single file
        $ swagger bundle swagger/api/<apiname>.yaml -o <bundlename>.json
- Online editor
        http://editor.swagger.io
