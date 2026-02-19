import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserType {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;
}
