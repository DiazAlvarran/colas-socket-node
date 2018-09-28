const { io } = require('../server');

const { TicketControl } = require('../classes/ticket-control');

const ticketControl = new TicketControl();

const azure = require('azure');

// Crear service bus
var serviceBusService = azure.createServiceBusService('Endpoint=sb://service-bus-arqui.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=rjoREhxHmJsFmr2LB9EC2KI7/sGb7vXALEPCAiOl/lU=');

// Crear cola para el service bus

/* serviceBusService.createQueueIfNotExists('myqueue', function(error) {
    if (error) {
        console.log('Error');
    }
    console.log('Se ha creado la cola');
}); */

io.on('connection', (client) => {

    client.on('siguienteTicket', (data, callback) => {

        let siguiente = ticketControl.siguiente();

        console.log(siguiente);

        callback(siguiente);

    });

    client.emit('estadoActual', {
        actual: ticketControl.getUltimoTicket(),
        ultimos4: ticketControl.getUltimos4()
    });

    client.on('atenderTicket', (data, callback) => {
        if (!data.escritorio) {
            return callback({
                err: true,
                mensaje: 'El escritorio es necesario'
            });
        }

        let atenderTicket = ticketControl.atenderTicket(data.escritorio);

        //Crear mensaje y mandarlo al service bus
        var numero_escritorio = String(atenderTicket.numero) + ' ' + String(atenderTicket.escritorio);

        console.log('===Número y escritorio que va al service bus: ', numero_escritorio);

        var message = {
            body: numero_escritorio,
            customProperties: {
                testproperty: 'TestValue'
            }
        };
        serviceBusService.sendQueueMessage('myqueue', message, function(error) {
            if (!error) {
                console.log('Se envió el mensaje');
            }
        });

        callback(atenderTicket);

        // actualiza/notifica cambios en los ULTIMOS 4
        client.broadcast.emit('ultimos4', {
            ultimos4: ticketControl.getUltimos4()
        });

    });

});