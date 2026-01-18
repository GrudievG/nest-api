import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import appConfig from './config/app.config';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    skipProcessEnv: true,
    load: [appConfig],
  }), UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
