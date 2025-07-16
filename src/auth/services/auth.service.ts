import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { UserService } from "../../user/user.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { from } from "rxjs";
import { Repository } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { stringify } from "querystring";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async signIn(email: string, password: string) {
    // Usamos leftJoinAndSelect para cargar los roles
    const user = await this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role") // Esto asegura que los roles sean cargados
      .where("user.email = :email", { email })
      .getOne();

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    // Verificar que el email esté verificado
    if (!user.email_verified) {
      throw new UnauthorizedException(
        "Please verify your email address before logging in. Check your inbox for the verification email.",
      );
    }

    const payload = {
      id: user.id,
      email: user.email,
      roles: user.roles, // Los roles deberían estar ahora cargados
    };

    return {
      ...payload,
      token: await this.jwtService.signAsync(payload),
    };
  }

  async sendMail(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user)
      throw new NotFoundException(`The user with email ${email} not found`);

    const brevo = require("@getbrevo/brevo");
    let apiInstance = new brevo.TransactionalEmailsApi();

    let apiKey = apiInstance.authentications["apiKey"];
    apiKey.apiKey = `${process.env.BREVO_API}`;

    let sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "{{params.subject}}";

    sendSmtpEmail.htmlContent = `
        <html>
            <body>
            <div style="font-family: Arial, sans-serif; color: #fff;">
            <div style="text-align: center; padding: 20px; background-color: #b4b4e2;">
                <h1 >¡Hola, ${user.email}!</h1>
                <h3 font-weight: bold;">¡Entra al siguiente enlace para recuperar tu contraseña!</h3>
                
            </div>

            <div style="padding: 20px; background-color: #f5f5f5; color: black; text-align: center; margin: 0 auto; max-width: 600px;">
                <p> ${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/forgot/${user.id}</p>
                <h2 style="margin-top: 20px;">Gracias por confiar en nuestra página!</h2>
            </div>
            <div style="color: #fff; text-align: center; margin: 0 auto; max-width: 600px; padding-top: 20px;">
                <p>-------------------------</p>
            </div>
        </body>
        </html>
        `;

    sendSmtpEmail.sender = { name: "Suarec", email: "dyez1110@gmail.com" };
    sendSmtpEmail.to = [{ email: user.email }];
    sendSmtpEmail.replyTo = { email: "dyez1110@gmail.com" };
    sendSmtpEmail.headers = { "Some-Custom-Name": "unique-id-1234" };
    sendSmtpEmail.params = {
      parameter: "My param value",
      subject: "¡Perdiste tu contraseña, no te preocupes!",
    };

    apiInstance.sendTransacEmail(sendSmtpEmail).then(
      function (data) {
        console.log(
          "API called successfully. Returned data: " + JSON.stringify(data),
        );
      },
      function (error) {
        console.error(error);
      },
    );
  }

  async changePassword(id: number, password: string) {
    let user = await this.userRepository.findOne({
      where: { id: id },
    });

    if (!user) throw new NotFoundException(`User Not fund`);

    if (typeof password !== "string") {
      throw new Error("Password must be a string");
    }

    user.password = bcrypt.hashSync(password, 10);

    this.userRepository.save(user);
  }
}
