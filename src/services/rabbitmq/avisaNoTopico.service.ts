import { Channel } from "amqplib";
import * as rabbitConf from '../../common/rabbit.config';


export async function avisaNoTopico ( connection: Channel, viagemId: number ) {

  connection.publish(
    rabbitConf.rabbitTopicName,
    rabbitConf.rabbitPublishRoutingKey,
    new Buffer( JSON.stringify( { viagem: viagemId } ) ),
    { persistent: false }
  );
}
