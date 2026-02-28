import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.postLike.deleteMany();
  await prisma.societyPost.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.event.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.societyFollower.deleteMany();
  await prisma.society.deleteMany();
  await prisma.user.deleteMany();

  // Create Users (passwords are plaintext for demo purposes)
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'student@tcd.ie',
        name: 'John Smith',
        password: 'password123',
        isOrganiser: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'organiser@tcd.ie',
        name: 'Sarah Jones',
        password: 'password123',
        isOrganiser: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'alice@tcd.ie',
        name: 'Alice Murphy',
        password: 'password123',
        isOrganiser: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@tcd.ie',
        name: "Bob O'Brien",
        password: 'password123',
        isOrganiser: true,
      },
    }),
  ]);

  // Create Societies - comprehensive list of 100+ TCD societies
  const societyData = [
    // Original 6 societies
    { name: 'DU Players', description: "Trinity's premier drama society, staging productions in the Samuel Beckett Theatre.", category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800' },
    { name: 'Computer Science Society', description: 'Promoting tech culture through hackathons, talks, and workshops.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800' },
    { name: 'Celtic Music Society', description: 'Celebrating Irish traditional music with weekly sessions and concerts.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800' },
    { name: 'Philosophical Society', description: "Ireland's oldest student society, hosting debates and speaker events since 1683.", category: 'Debate & Speaking', imageUrl: 'https://images.unsplash.com/photo-1574168104291-ac4e706a3adb?w=800' },
    { name: 'Dance Society', description: 'From ballroom to hip-hop, showcasing diverse dance styles.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800' },
    { name: 'Film Society', description: 'Weekly screenings, film production workshops, and cinema trips.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800' },

    // Cultural & International Societies
    { name: 'Trinity South Asian Society', description: 'Celebrating South Asian culture through Diwali, Holi, cultural nights, and community events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=800' },
    { name: 'African Caribbean Society', description: 'Promoting African and Caribbean culture, heritage, and community.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800' },
    { name: 'Chinese Society', description: 'Bringing Chinese culture to Trinity through events, festivals, and language exchange.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?w=800' },
    { name: 'Middle Eastern Society', description: 'Celebrating Middle Eastern culture, cuisine, and traditions.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1466442929976-97f336a657be?w=800' },
    { name: 'Latin American Society', description: 'Promoting Latin American culture through salsa nights, language exchange, and fiestas.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800' },
    { name: 'Japanese Society', description: 'Exploring Japanese culture through anime screenings, language classes, and cultural events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800' },
    { name: 'Korean Society', description: 'K-culture enthusiasts unite! K-pop, Korean food, and language exchange.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800' },
    { name: 'European Society', description: 'Celebrating European diversity through cultural exchanges and EU-focused events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1485081669829-bacb8c7bb1f3?w=800' },
    { name: 'American Society', description: 'Connecting American students and celebrating US culture at Trinity.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800' },
    { name: 'French Society', description: 'French language, culture, wine tastings, and cinema.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800' },
    { name: 'German Society', description: 'German language practice, Oktoberfest, and cultural events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800' },
    { name: 'Spanish Society', description: 'Spanish and Hispanic culture through tapas nights and language exchange.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800' },
    { name: 'Italian Society', description: 'Italian culture, language, food, and film screenings.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800' },
    { name: 'Polish Society', description: 'Polish culture, traditions, and community events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=800' },
    { name: 'Indian Society', description: 'Celebrating Indian festivals, cuisine, and cultural heritage.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800' },
    { name: 'Pakistani Society', description: 'Pakistani culture, food, and community building.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1586076844275-f0b6e7cd3b7f?w=800' },
    { name: 'Nigerian Society', description: 'Nigerian culture, Afrobeats, and community events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800' },
    { name: 'Malaysian & Singaporean Society', description: 'SEA culture, food festivals, and community events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800' },
    { name: 'Thai Society', description: 'Thai culture, Songkran celebrations, and food events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800' },
    { name: 'Vietnamese Society', description: 'Vietnamese culture, Tet celebrations, and pho nights.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800' },

    // Academic & Professional Societies
    { name: 'Law Society', description: 'Mooting competitions, legal debates, and career networking.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800' },
    { name: 'Medical Society', description: 'Healthcare talks, anatomy workshops, and medical career events.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800' },
    { name: 'Engineering Society', description: 'Engineering projects, industry talks, and site visits.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800' },
    { name: 'Business Society', description: 'Entrepreneurship, networking, and business case competitions.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800' },
    { name: 'Economics Society', description: 'Economic debates, trading simulations, and finance talks.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800' },
    { name: 'Physics Society', description: 'Physics demonstrations, stargazing nights, and science talks.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800' },
    { name: 'Chemistry Society', description: 'Lab demonstrations, chemistry magic shows, and industry visits.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800' },
    { name: 'Biology Society', description: 'Nature walks, lab tours, and biology research talks.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800' },
    { name: 'Mathematics Society', description: 'Puzzle nights, math olympiad prep, and problem-solving workshops.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800' },
    { name: 'History Society', description: 'Historical debates, museum trips, and guest lectures.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12a74?w=800' },
    { name: 'Psychology Society', description: 'Psychology experiments, mental health awareness, and career talks.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800' },
    { name: 'Philosophy Society', description: 'Philosophical discussions, ethics debates, and reading groups.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800' },
    { name: 'Political Science Society', description: 'Political debates, election simulations, and policy discussions.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800' },
    { name: 'Data Science Society', description: 'Data analytics workshops, machine learning projects, and hackathons.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800' },
    { name: 'Biomedical Engineering Society', description: 'Medical device innovation and healthcare technology.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800' },
    { name: 'Environmental Society', description: 'Sustainability initiatives, climate action, and nature conservation.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800' },
    { name: 'Genetics Society', description: 'Genomics research, CRISPR workshops, and biotech careers.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=800' },
    { name: 'Pharmacy Society', description: 'Pharmaceutical science, drug discovery, and healthcare careers.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800' },
    { name: 'Dental Society', description: 'Dental health awareness and dental career networking.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800' },
    { name: 'Veterinary Society', description: 'Animal welfare, veterinary careers, and pet care workshops.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800' },
    { name: 'Architecture Society', description: 'Design workshops, building tours, and architectural competitions.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800' },

    // Arts & Creative Societies
    { name: 'Photography Society', description: 'Photo walks, darkroom workshops, and exhibitions.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800' },
    { name: 'Art Society', description: 'Life drawing, painting workshops, and gallery visits.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800' },
    { name: 'Creative Writing Society', description: 'Writing workshops, poetry nights, and publication opportunities.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800' },
    { name: 'Literary Society', description: 'Book clubs, author talks, and literary discussions.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800' },
    { name: 'Journalism Society', description: 'Student newspaper, media workshops, and journalism careers.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800' },
    { name: 'Broadcasting Society', description: 'Radio shows, podcasting, and media production.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800' },
    { name: 'Comedy Society', description: 'Stand-up nights, improv workshops, and comedy writing.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800' },
    { name: 'Fashion Society', description: 'Fashion shows, styling workshops, and industry networking.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800' },
    { name: 'Animation Society', description: '2D and 3D animation workshops and film screenings.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=800' },
    { name: 'Graphic Design Society', description: 'Design workshops, portfolio reviews, and creative challenges.', category: 'Arts & Culture', imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800' },

    // Music Societies
    { name: 'Orchestra Society', description: 'Classical music performances and orchestral concerts.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800' },
    { name: 'Choral Society', description: 'Choir performances, Christmas concerts, and singing workshops.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800' },
    { name: 'Jazz Society', description: 'Jazz nights, jam sessions, and improvisation workshops.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800' },
    { name: 'Rock & Alternative Society', description: 'Battle of the bands, gig nights, and rock music appreciation.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800' },
    { name: 'Electronic Music Society', description: 'DJ workshops, electronic music production, and club nights.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e4?w=800' },
    { name: 'A Cappella Society', description: 'A cappella performances and vocal arrangement workshops.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800' },
    { name: 'Musical Theatre Society', description: 'Musical productions, singing workshops, and show trips.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800' },
    { name: 'Hip Hop Society', description: 'Hip hop culture, rap battles, and dance sessions.', category: 'Music', imageUrl: 'https://images.unsplash.com/photo-1547355253-ff0740f6e8c1?w=800' },

    // Sports & Fitness Societies
    { name: 'Rowing Club', description: 'Competitive rowing on the Liffey and fitness training.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73?w=800' },
    { name: 'Rugby Club', description: 'Rugby training, matches, and social events.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1544298621-a28b8d14c02e?w=800' },
    { name: 'Football Club', description: 'Soccer training, leagues, and tournaments.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800' },
    { name: 'GAA Club', description: 'Gaelic football and hurling training and matches.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800' },
    { name: 'Basketball Club', description: 'Basketball training, leagues, and tournaments.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800' },
    { name: 'Tennis Club', description: 'Tennis coaching, tournaments, and social tennis.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800' },
    { name: 'Swimming Club', description: 'Swimming training, competitions, and water polo.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800' },
    { name: 'Athletics Club', description: 'Track and field training and competitions.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1461896836934-49b71db6e8fa?w=800' },
    { name: 'Cycling Club', description: 'Road cycling, mountain biking, and cycling trips.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800' },
    { name: 'Mountaineering Club', description: 'Hill walking, rock climbing, and outdoor adventures.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800' },
    { name: 'Sailing Club', description: 'Dinghy sailing, yacht racing, and sailing trips.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=800' },
    { name: 'Surf Club', description: 'Surfing trips, lessons, and beach weekends.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800' },
    { name: 'Yoga Society', description: 'Yoga classes, meditation, and wellness workshops.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800' },
    { name: 'Martial Arts Society', description: 'Karate, judo, taekwondo, and self-defense classes.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800' },
    { name: 'Boxing Club', description: 'Boxing training, fitness classes, and sparring sessions.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800' },
    { name: 'Fencing Club', description: 'Fencing training and competitive fencing.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800' },
    { name: 'Hockey Club', description: 'Field hockey training and matches.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1580748142506-d13db5e31b65?w=800' },
    { name: 'Cricket Club', description: 'Cricket training, matches, and social events.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800' },
    { name: 'Volleyball Club', description: 'Indoor and beach volleyball training and tournaments.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'Badminton Club', description: 'Badminton training and social games.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800' },
    { name: 'Table Tennis Club', description: 'Table tennis training and tournaments.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1558657252635-9b11e8aa5254?w=800' },
    { name: 'Triathlon Club', description: 'Triathlon training and competitions.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800' },
    { name: 'Equestrian Club', description: 'Horse riding lessons and equestrian events.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800' },
    { name: 'Golf Club', description: 'Golf outings, lessons, and tournaments.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800' },
    { name: 'Ultimate Frisbee Club', description: 'Ultimate frisbee training and tournaments.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1472745942893-4b9f730c7668?w=800' },
    { name: 'Esports Society', description: 'Competitive gaming, tournaments, and LAN parties.', category: 'Sports & Fitness', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800' },

    // Debate & Speaking Societies
    { name: 'Historical Society', description: 'Debates on historical topics and speaker events.', category: 'Debate & Speaking', imageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12a74?w=800' },
    { name: 'Model United Nations Society', description: 'MUN conferences, diplomatic simulations, and debates.', category: 'Debate & Speaking', imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800' },
    { name: 'Law Society Debating', description: 'Legal debates, mooting, and advocacy training.', category: 'Debate & Speaking', imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800' },
    { name: 'Public Speaking Society', description: 'Public speaking workshops and Toastmasters-style meetings.', category: 'Debate & Speaking', imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800' },

    // Religious & Spiritual Societies
    { name: 'Christian Union', description: 'Christian fellowship, Bible study, and spiritual events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800' },
    { name: 'Islamic Society', description: 'Muslim community, prayer facilities, and Islamic events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800' },
    { name: 'Jewish Society', description: 'Jewish culture, Shabbat dinners, and community events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=800' },
    { name: 'Hindu Society', description: 'Hindu festivals, puja ceremonies, and cultural events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=800' },
    { name: 'Buddhist Society', description: 'Meditation sessions, Buddhist teachings, and retreats.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800' },
    { name: 'Sikh Society', description: 'Sikh community, langar, and cultural celebrations.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800' },

    // Special Interest Societies
    { name: 'Chess Society', description: 'Chess tournaments, lessons, and casual play.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800' },
    { name: 'Board Games Society', description: 'Board game nights, strategy games, and tabletop RPGs.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800' },
    { name: 'Anime & Manga Society', description: 'Anime screenings, manga reading, and cosplay events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
    { name: 'Video Games Society', description: 'Gaming sessions, tournaments, and game development.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=800' },
    { name: 'Harry Potter Society', description: 'Wizarding world events, trivia nights, and movie marathons.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=800' },
    { name: 'Science Fiction & Fantasy Society', description: 'Sci-fi and fantasy book clubs, screenings, and conventions.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'Wine Society', description: 'Wine tastings, vineyard trips, and sommelier workshops.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800' },
    { name: 'Food Society', description: 'Food tours, cooking workshops, and restaurant visits.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800' },
    { name: 'Coffee Society', description: 'Coffee tastings, barista workshops, and cafe hopping.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800' },
    { name: 'Vegetarian Society', description: 'Plant-based cooking, vegan events, and ethical eating.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800' },
    { name: 'Cocktail Society', description: 'Mixology workshops, cocktail nights, and bar tours.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800' },
    { name: 'Travel Society', description: 'Travel talks, trip planning, and group adventures.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800' },
    { name: 'Astronomy Society', description: 'Stargazing nights, telescope sessions, and space talks.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800' },
    { name: 'Robotics Society', description: 'Robot building, competitions, and AI workshops.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800' },
    { name: 'Entrepreneurship Society', description: 'Startup pitches, entrepreneurship workshops, and networking.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800' },
    { name: 'Investment Society', description: 'Stock trading simulations, investment workshops, and finance talks.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800' },
    { name: 'Consulting Society', description: 'Case competitions, consulting workshops, and career prep.', category: 'Academic', imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800' },

    // LGBTQ+ & Identity Societies
    { name: 'LGBTQ+ Society', description: 'LGBTQ+ community, pride events, and support networks.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800' },
    { name: 'Gender Equality Society', description: 'Gender equality advocacy, workshops, and awareness events.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800' },
    { name: 'Feminist Society', description: "Women's rights, feminist theory, and activism.", category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800' },

    // Charity & Volunteering
    { name: 'Volunteer Society', description: 'Volunteering opportunities, charity drives, and community service.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800' },
    { name: 'Amnesty International Society', description: 'Human rights advocacy and awareness campaigns.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800' },
    { name: 'UNICEF Society', description: "Children's rights advocacy and fundraising.", category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800' },
    { name: 'Red Cross Society', description: 'First aid training, blood drives, and humanitarian aid.', category: 'Social', imageUrl: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=800' },
  ];

  const societies = await Promise.all(
    societyData.map((data, index) =>
      prisma.society.create({
        data: {
          ...data,
          location: JSON.stringify({ lat: 53.343 + (index * 0.0001), lng: -6.254 + (index * 0.0001) }),
        },
      })
    )
  );

  // Create Events at real TCD buildings
  const events = await Promise.all([
    // DU Players — Samuel Beckett Theatre
    prisma.event.create({
      data: {
        title: 'Waiting for Godot',
        description:
          "A masterful production of Samuel Beckett's absurdist masterpiece. Two evenings of existential comedy.",
        societyId: societies[0].id,
        startDate: new Date('2026-03-15T19:30:00'),
        endDate: new Date('2026-03-15T21:30:00'),
        location: 'Samuel Beckett Theatre',
        locationCoords: JSON.stringify({ lat: 53.34305, lng: -6.25475 }),
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800',
        tags: JSON.stringify(['theatre', 'drama', 'beckett']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Standard', price: 12.0, quantity: 150, available: 150 },
            { name: 'Student', price: 8.0, quantity: 100, available: 100 },
          ],
        },
      },
    }),
    // DU Players — Players Theatre (Front Square)
    prisma.event.create({
      data: {
        title: 'Improv Comedy Night',
        description:
          'Fast-paced improvisational comedy. Audience participation encouraged!',
        societyId: societies[0].id,
        startDate: new Date('2026-02-28T20:00:00'),
        endDate: new Date('2026-02-28T22:00:00'),
        location: 'Players Theatre, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34385, lng: -6.2557 }),
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
        tags: JSON.stringify(['comedy', 'improv', 'interactive']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            {
              name: 'General Admission',
              price: 6.0,
              quantity: 80,
              available: 80,
            },
          ],
        },
      },
    }),

    // CS Society — O'Reilly Institute
    prisma.event.create({
      data: {
        title: 'Trinity Hackathon 2026',
        description:
          '24-hour coding marathon with prizes, workshops, and free pizza. Build something amazing!',
        societyId: societies[1].id,
        startDate: new Date('2026-03-20T09:00:00'),
        endDate: new Date('2026-03-21T09:00:00'),
        location: "O'Reilly Institute",
        locationCoords: JSON.stringify({ lat: 53.34265, lng: -6.25185 }),
        category: 'Academic',
        imageUrl:
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
        tags: JSON.stringify(['hackathon', 'coding', 'tech']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'Participant', price: 0.0, quantity: 200, available: 200 },
          ],
        },
      },
    }),
    // CS Society — Hamilton Building
    prisma.event.create({
      data: {
        title: 'AI & Machine Learning Workshop',
        description:
          'Hands-on introduction to neural networks using TensorFlow. Laptops required.',
        societyId: societies[1].id,
        startDate: new Date('2026-02-25T18:00:00'),
        endDate: new Date('2026-02-25T20:30:00'),
        location: 'Hamilton Building, Lecture Theatre',
        locationCoords: JSON.stringify({ lat: 53.34285, lng: -6.25095 }),
        category: 'Academic',
        imageUrl:
          'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
        tags: JSON.stringify(['AI', 'machine learning', 'workshop']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'Participant', price: 5.0, quantity: 50, available: 50 },
          ],
        },
      },
    }),

    // Celtic Music — The Buttery
    prisma.event.create({
      data: {
        title: 'Traditional Irish Session',
        description:
          'Weekly trad session — all musicians welcome. Bring your instruments!',
        societyId: societies[2].id,
        startDate: new Date('2026-02-20T19:00:00'),
        endDate: new Date('2026-02-20T22:00:00'),
        location: 'The Buttery',
        locationCoords: JSON.stringify({ lat: 53.34365, lng: -6.25415 }),
        category: 'Music',
        imageUrl:
          'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
        tags: JSON.stringify(['trad', 'session', 'irish music']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Entry', price: 0.0, quantity: 100, available: 100 },
          ],
        },
      },
    }),
    // Celtic Music — Exam Hall
    prisma.event.create({
      data: {
        title: 'Celtic Concert: The Chieftains Tribute',
        description:
          'An evening celebrating The Chieftains with performances from top Irish musicians.',
        societyId: societies[2].id,
        startDate: new Date('2026-03-17T20:00:00'),
        endDate: new Date('2026-03-17T22:30:00'),
        location: 'Exam Hall, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34435, lng: -6.2559 }),
        category: 'Music',
        imageUrl:
          'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800',
        tags: JSON.stringify(['concert', 'celtic', 'irish music']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Standard', price: 15.0, quantity: 200, available: 200 },
            { name: 'VIP', price: 25.0, quantity: 50, available: 50 },
          ],
        },
      },
    }),

    // Phil — Graduates Memorial Building (GMB)
    prisma.event.create({
      data: {
        title: 'The Phil Debate: Climate Action',
        description:
          'Motion: "This house believes climate activism justifies civil disobedience"',
        societyId: societies[3].id,
        startDate: new Date('2026-02-27T19:30:00'),
        endDate: new Date('2026-02-27T21:30:00'),
        location: 'Graduates Memorial Building (GMB)',
        locationCoords: JSON.stringify({ lat: 53.34395, lng: -6.25545 }),
        category: 'Debate & Speaking',
        imageUrl:
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        tags: JSON.stringify(['debate', 'climate', 'politics']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            {
              name: 'General Admission',
              price: 3.0,
              quantity: 120,
              available: 120,
            },
          ],
        },
      },
    }),
    // Phil — Public Theatre, Front Square
    prisma.event.create({
      data: {
        title: 'Guest Speaker: Dr. Jane Goodall',
        description:
          'An evening with the legendary primatologist and conservationist.',
        societyId: societies[3].id,
        startDate: new Date('2026-04-10T18:00:00'),
        endDate: new Date('2026-04-10T20:00:00'),
        location: 'Public Theatre, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34408, lng: -6.25535 }),
        category: 'Debate & Speaking',
        imageUrl:
          'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
        tags: JSON.stringify(['speaker', 'conservation', 'science']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'Student', price: 10.0, quantity: 150, available: 150 },
            { name: 'Staff', price: 15.0, quantity: 50, available: 50 },
          ],
        },
      },
    }),

    // Dance Society — Dining Hall
    prisma.event.create({
      data: {
        title: 'Winter Showcase',
        description:
          'Annual dance showcase featuring ballet, contemporary, hip-hop, and ballroom performances.',
        societyId: societies[4].id,
        startDate: new Date('2026-03-05T19:00:00'),
        endDate: new Date('2026-03-05T21:30:00'),
        location: 'Dining Hall, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34435, lng: -6.2559 }),
        category: 'Sports & Fitness',
        imageUrl:
          'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800',
        tags: JSON.stringify(['dance', 'showcase', 'performance']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Standard', price: 8.0, quantity: 180, available: 180 },
            { name: 'Concession', price: 5.0, quantity: 70, available: 70 },
          ],
        },
      },
    }),
    // Dance Society — Exam Hall
    prisma.event.create({
      data: {
        title: 'Salsa Night',
        description:
          'Beginner-friendly salsa lesson followed by social dancing. No partner needed!',
        societyId: societies[4].id,
        startDate: new Date('2026-02-22T19:30:00'),
        endDate: new Date('2026-02-22T22:00:00'),
        location: 'Exam Hall, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34435, lng: -6.2559 }),
        category: 'Sports & Fitness',
        imageUrl:
          'https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=800',
        tags: JSON.stringify(['salsa', 'dance', 'social']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Entry', price: 4.0, quantity: 100, available: 100 },
          ],
        },
      },
    }),

    // Film Society — Science Gallery
    prisma.event.create({
      data: {
        title: 'Cult Classic: The Big Lebowski',
        description:
          'Late night screening of the Coen Brothers classic. The Dude abides.',
        societyId: societies[5].id,
        startDate: new Date('2026-02-21T21:00:00'),
        endDate: new Date('2026-02-21T23:15:00'),
        location: 'Science Gallery, Pearse Street',
        locationCoords: JSON.stringify({ lat: 53.34215, lng: -6.25105 }),
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800',
        tags: JSON.stringify(['film', 'screening', 'cult classic']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            {
              name: 'General Admission',
              price: 3.0,
              quantity: 150,
              available: 150,
            },
          ],
        },
      },
    }),
    // Film Society — Arts Building, Lecture Theatre
    prisma.event.create({
      data: {
        title: 'Short Film Competition Finals',
        description:
          'Screening of finalist films made by Trinity students. Audience vote for the winner!',
        societyId: societies[5].id,
        startDate: new Date('2026-03-25T19:00:00'),
        endDate: new Date('2026-03-25T21:30:00'),
        location: 'Arts Building, Lecture Theatre',
        locationCoords: JSON.stringify({ lat: 53.34335, lng: -6.2533 }),
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800',
        tags: JSON.stringify(['film', 'competition', 'student work']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'Entry', price: 5.0, quantity: 100, available: 100 },
          ],
        },
      },
    }),
  ]);

  // Create THIS WEEK events (for weekly updates)
  const thisWeekEvents = await Promise.all([
    // DU Players — this week (student follows this)
    prisma.event.create({
      data: {
        title: 'One-Act Play Festival',
        description:
          'Three original one-act plays written and performed by Trinity students. A celebration of new Irish writing.',
        societyId: societies[0].id,
        startDate: new Date('2026-02-06T19:00:00'),
        endDate: new Date('2026-02-06T21:30:00'),
        location: 'Samuel Beckett Theatre',
        locationCoords: JSON.stringify({ lat: 53.34305, lng: -6.25475 }),
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800',
        tags: JSON.stringify(['theatre', 'one-act', 'new writing']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Standard', price: 10.0, quantity: 120, available: 120 },
            { name: 'Student', price: 6.0, quantity: 80, available: 80 },
          ],
        },
      },
    }),
    // DU Players — this week
    prisma.event.create({
      data: {
        title: 'Backstage Workshop: Stage Lighting',
        description:
          'Learn the fundamentals of stage lighting design. Open to all skill levels.',
        societyId: societies[0].id,
        startDate: new Date('2026-02-08T14:00:00'),
        endDate: new Date('2026-02-08T17:00:00'),
        location: 'Players Theatre, Front Square',
        locationCoords: JSON.stringify({ lat: 53.34385, lng: -6.2557 }),
        category: 'Arts & Culture',
        imageUrl:
          'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
        tags: JSON.stringify(['workshop', 'lighting', 'backstage']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Participant', price: 0.0, quantity: 30, available: 30 },
          ],
        },
      },
    }),

    // CS Society — this week (student follows this)
    prisma.event.create({
      data: {
        title: 'Web Dev Workshop: Next.js & React',
        description:
          'Build a full-stack app from scratch using Next.js 14, React, and Tailwind CSS. Bring your laptop!',
        societyId: societies[1].id,
        startDate: new Date('2026-02-05T18:00:00'),
        endDate: new Date('2026-02-05T20:00:00'),
        location: "O'Reilly Institute, Room 013",
        locationCoords: JSON.stringify({ lat: 53.34265, lng: -6.25185 }),
        category: 'Academic',
        imageUrl:
          'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
        tags: JSON.stringify(['web dev', 'nextjs', 'react', 'workshop']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'Participant', price: 0.0, quantity: 60, available: 60 },
          ],
        },
      },
    }),
    // CS Society — this week
    prisma.event.create({
      data: {
        title: 'Career Panel: Working in Big Tech',
        description:
          'Alumni from Google, Microsoft, and Stripe share advice on landing your first tech job.',
        societyId: societies[1].id,
        startDate: new Date('2026-02-07T17:00:00'),
        endDate: new Date('2026-02-07T19:00:00'),
        location: 'Hamilton Building, Lecture Theatre',
        locationCoords: JSON.stringify({ lat: 53.34285, lng: -6.25095 }),
        category: 'Academic',
        imageUrl:
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
        tags: JSON.stringify(['career', 'tech', 'panel', 'alumni']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'Free Entry', price: 0.0, quantity: 100, available: 100 },
          ],
        },
      },
    }),

    // Celtic Music — this week (organiser follows this)
    prisma.event.create({
      data: {
        title: 'Open Mic Night',
        description:
          'Acoustic open mic — singers, musicians, poets all welcome. Sign up on the night!',
        societyId: societies[2].id,
        startDate: new Date('2026-02-06T20:00:00'),
        endDate: new Date('2026-02-06T23:00:00'),
        location: 'The Buttery',
        locationCoords: JSON.stringify({ lat: 53.34365, lng: -6.25415 }),
        category: 'Music',
        imageUrl:
          'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
        tags: JSON.stringify(['open mic', 'acoustic', 'live music']),
        organiserId: users[1].id,
        ticketTypes: {
          create: [
            { name: 'Entry', price: 0.0, quantity: 80, available: 80 },
          ],
        },
      },
    }),

    // Phil — this week (organiser follows this)
    prisma.event.create({
      data: {
        title: 'Debate: Should University Be Free?',
        description:
          'A lively debate on the future of higher education funding in Ireland. All welcome to speak from the floor.',
        societyId: societies[3].id,
        startDate: new Date('2026-02-09T19:00:00'),
        endDate: new Date('2026-02-09T21:00:00'),
        location: 'Graduates Memorial Building (GMB)',
        locationCoords: JSON.stringify({ lat: 53.34395, lng: -6.25545 }),
        category: 'Debate & Speaking',
        imageUrl:
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        tags: JSON.stringify(['debate', 'education', 'free speech']),
        organiserId: users[3].id,
        ticketTypes: {
          create: [
            { name: 'General Admission', price: 2.0, quantity: 100, available: 100 },
          ],
        },
      },
    }),
  ]);

  // Create Coupons
  const coupons = await Promise.all([
    prisma.coupon.create({
      data: {
        code: 'WELCOME2026',
        discountPercent: 20,
        expiresAt: new Date('2026-12-31'),
        maxUses: 1000,
        usedCount: 0,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'STUDENT50',
        discountPercent: 50,
        expiresAt: new Date('2026-06-30'),
        maxUses: 500,
        usedCount: 0,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'EARLYBIRD',
        discountPercent: 15,
        expiresAt: new Date('2026-03-01'),
        maxUses: 200,
        usedCount: 0,
      },
    }),
  ]);

  // Create a sample booking
  const studentTicketType = await prisma.ticketType.findFirst({
    where: { eventId: events[0].id, name: 'Student' },
  });

  if (studentTicketType) {
    await prisma.order.create({
      data: {
        userId: users[0].id,
        eventId: events[0].id,
        totalAmount: 8.4,
        status: 'CONFIRMED',
        tickets: {
          create: [
            {
              ticketTypeId: studentTicketType.id,
              price: 8.0,
              qrCode:
                'QR-' +
                Math.random().toString(36).substr(2, 9).toUpperCase(),
            },
          ],
        },
      },
    });
  }

  // Create society followers
  await prisma.societyFollower.createMany({
    data: [
      // John Smith (student) follows DU Players + CS Society
      { userId: users[0].id, societyId: societies[0].id },
      { userId: users[0].id, societyId: societies[1].id },
      // Sarah Jones (organiser) follows Celtic Music + Phil + Film Society
      { userId: users[1].id, societyId: societies[2].id },
      { userId: users[1].id, societyId: societies[3].id },
      { userId: users[1].id, societyId: societies[5].id },
      // Alice Murphy follows Celtic Music + Dance Society
      { userId: users[2].id, societyId: societies[2].id },
      { userId: users[2].id, societyId: societies[4].id },
      // Bob O'Brien (organiser) follows CS Society + Phil
      { userId: users[3].id, societyId: societies[1].id },
      { userId: users[3].id, societyId: societies[3].id },
    ],
  });

  // Create society promotional posts (mock Instagram-style posts for the 6 main societies)
  const posts = await Promise.all([
    // DU Players — pinned promo post
    prisma.societyPost.create({
      data: {
        societyId: societies[0].id,
        eventId: events[0].id,
        imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800',
        caption: '🎭 Waiting for Godot opens next week! One of Beckett\'s greatest works, brought to life on the Samuel Beckett Theatre stage. Tickets going fast — grab yours now! #DUPlayers #TrinityTheatre #WaitingForGodot',
        isPinned: true,
      },
    }),
    // DU Players — second post
    prisma.societyPost.create({
      data: {
        societyId: societies[0].id,
        imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800',
        caption: '🌟 Auditions for our Spring term production are OPEN! No experience required — just passion for theatre. DM us or drop into rehearsal on Thursday. #Auditions #Theatre #TrinityCollege',
        isPinned: false,
      },
    }),

    // CS Society — pinned promo post
    prisma.societyPost.create({
      data: {
        societyId: societies[1].id,
        eventId: events[1].id,
        imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
        caption: '🤖 AI & ML Workshop this week in the Hamilton Building! We\'ll be building neural networks with TensorFlow. Bring your laptop and your curiosity. Limited spots — book now! #ArtificialIntelligence #TrinityCS #Hackathon',
        isPinned: true,
      },
    }),
    // CS Society — second post
    prisma.societyPost.create({
      data: {
        societyId: societies[1].id,
        imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
        caption: '💻 Trinity Hackathon 2026 is COMING! Mark your calendars for March 20-21. 24 hours, amazing prizes, and free pizza. Register your team now! #TrinityHackathon #Coding #BuildSomethingCool',
        isPinned: false,
      },
    }),

    // Celtic Music Society — pinned promo post
    prisma.societyPost.create({
      data: {
        societyId: societies[2].id,
        eventId: events[2].id,
        imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
        caption: '🎸 Trad Session tonight at The Buttery! All musicians welcome — fiddles, flutes, uilleann pipes, you name it. First time? Perfect! Come along, the craic will be mighty. Free entry! #TradMusic #IrishMusic #TheButtery',
        isPinned: true,
      },
    }),
    // Celtic Music Society — second post
    prisma.societyPost.create({
      data: {
        societyId: societies[2].id,
        imageUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800',
        caption: '☘️ St. Patrick\'s Day Concert tickets now on sale! The Chieftains Tribute night at the Exam Hall — this will be an evening to remember. Céad míle fáilte! #StPatricksDay #IrishMusic #Celtic',
        isPinned: false,
      },
    }),

    // Philosophical Society — pinned promo post
    prisma.societyPost.create({
      data: {
        societyId: societies[3].id,
        eventId: events[4].id,
        imageUrl: 'https://images.unsplash.com/photo-1574168104291-ac4e706a3adb?w=800',
        caption: '🎤 DEBATE NIGHT: "This house believes climate activism justifies civil disobedience." Feb 27th, GMB. Come ready to argue. Speakers include leading academics and activists. #ThePhil #Debate #ClimateAction',
        isPinned: true,
      },
    }),

    // Dance Society — pinned promo post
    prisma.societyPost.create({
      data: {
        societyId: societies[4].id,
        eventId: events[5].id,
        imageUrl: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800',
        caption: '💃 Winter Dance Showcase tickets are here! Join us for an incredible evening of ballet, contemporary, hip-hop, and ballroom. Our biggest show of the year. #DanceSociety #TrinityDance #WinterShowcase',
        isPinned: true,
      },
    }),
    // Dance Society — second post
    prisma.societyPost.create({
      data: {
        societyId: societies[4].id,
        imageUrl: 'https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=800',
        caption: '🕺 Salsa Night this Saturday! No partner, no experience needed. Just good vibes and great moves. €4 entry — see you on the floor! #SalsaNight #Dance #Beginner',
        isPinned: false,
      },
    }),

    // Film Society — pinned promo post
    prisma.societyPost.create({
      data: {
        societyId: societies[5].id,
        eventId: events[6].id,
        imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800',
        caption: '🎬 The Dude abides. Screening "The Big Lebowski" this Friday night at the Science Gallery. Cult classic, late-night vibes, €3 entry. You don\'t have to be a fan to enjoy this one. #FilmSociety #BigLebowski #CultClassic',
        isPinned: true,
      },
    }),
  ]);

  // Add sample post likes
  await prisma.postLike.createMany({
    data: [
      // John Smith likes DU Players + CS Society posts
      { userId: users[0].id, postId: posts[0].id },
      { userId: users[0].id, postId: posts[2].id },
      // Sarah Jones likes Celtic Music + Film Society posts
      { userId: users[1].id, postId: posts[4].id },
      { userId: users[1].id, postId: posts[8].id },
      // Alice Murphy likes Dance Society + Phil posts
      { userId: users[2].id, postId: posts[6].id },
      { userId: users[2].id, postId: posts[5].id },
      // Bob O'Brien likes CS Society + Celtic posts
      { userId: users[3].id, postId: posts[2].id },
      { userId: users[3].id, postId: posts[4].id },
    ],
  });

  console.log('Database seeded successfully!');
  console.log(`Created ${users.length} users`);
  console.log(`Created ${societies.length} societies`);
  console.log(`Created ${events.length} events`);
  console.log(`Created ${coupons.length} coupons`);
  console.log(`Created ${posts.length} society posts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
