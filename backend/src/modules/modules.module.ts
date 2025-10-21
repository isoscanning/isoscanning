import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { ProfilesModule } from "./profiles/profiles.module.js";
import { EquipmentsModule } from "./equipments/equipments.module.js";
import { AvailabilityModule } from "./availability/availability.module.js";
import { BookingsModule } from "./bookings/bookings.module.js";
import { QuotesModule } from "./quotes/quotes.module.js";
import { ReviewsModule } from "./reviews/reviews.module.js";
import { PortfolioModule } from "./portfolio/portfolio.module.js";
import { ProposalsModule } from "./proposals/proposals.module.js";

@Module({
  imports: [
    AuthModule,
    ProfilesModule,
    EquipmentsModule,
    AvailabilityModule,
    BookingsModule,
    QuotesModule,
    ReviewsModule,
    PortfolioModule,
    ProposalsModule,
  ],
})
export class ModulesModule {}




