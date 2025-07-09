<script lang="ts">
	import { Sparkle, Sparkles, User } from "lucide-svelte";

	const messages = [
		{
			role: 'user',
			content:
				"What's a popular breakfast spot on the way from poonamalle highway to the government museum"
		},
		{
			role: 'assistant',
			content: `Of course! As you head from the Poonamallee Highway towards the Government Museum in Egmore this morning, you'll be passing through several neighborhoods with excellent breakfast options. Here are a few popular spots along the way, ranging from iconic South Indian establishments to beloved local favorites:

Closer to Poonamallee Highway (Ideal if you want to eat early in your journey):
A2B - Adyar Ananda Bhavan: You will find several outlets of this famous vegetarian chain along the Poonamallee High Road. It's a reliable choice known for its extensive menu of South Indian breakfast classics like idli, dosa, pongal, and vada, served in a clean and family-friendly environment. Their filter coffee is also a must-try.

Murugan Idli Shop: If you're a fan of soft, fluffy idlis, a stop at the Murugan Idli Shop in the Porur area (along the main road) is highly recommended. They are legendary for their idlis served with a variety of chutneys and sambar. It's a true Chennai breakfast experience.

Midway and Closer to the Museum (In and around Kilpauk & Chetpet):
Saravana Bhavan: Another giant in the world of South Indian vegetarian cuisine, you'll find branches of Hotel Saravana Bhavan as you get closer to the city center. They offer a consistently high standard of food and service, with a wide array of dosas and other breakfast items. The branch in Kilpauk on Poonamallee High Road would be directly on your route.

Geetham Veg Restaurant: This is a popular vegetarian restaurant with several branches, including one that would be convenient on your route. They are well-regarded for their breakfast spreads, offering a delicious and authentic South Indian dining experience.

Very Close to the Government Museum (Perfect for a pre-museum meal):
Mathsya Restaurant, Egmore: Located very near the Government Museum, Mathsya is a fantastic and often bustling spot for breakfast. They are particularly known for their Udupi-style vegetarian cuisine. If you're looking for a place with a lively atmosphere and delicious food right before your museum visit, this is an excellent choice.

Madras Coffee House, Egmore: For a more casual and quick stop, the Madras Coffee House in Egmore offers authentic South Indian filter coffee and a selection of traditional snacks. It's a great place to experience the local coffee culture.

No matter which one you choose, you're in for a delightful South Indian breakfast to start your day of exploring the Government Museum. Enjoy your meal!`
		},
		{
			role: 'user',
			content: `Alright. I'm at the government museum. It is now 2pm. Suggest me some good and affordable lunch places near me. Something with local cuisine. I am looking for a good vegitarian meal. The restaurant doesn't have to be pure vegetarian but the food has to be good`
		},
		{
			role: 'assistant',
			content: `Of course! You're in a great spot for some fantastic and affordable local food. Given it's 2 PM on a Sunday, these places will be bustling but are excellent choices for a satisfying vegetarian meal.

Here are some good and affordable lunch places near the Government Museum, Egmore, with a focus on local cuisine:

Top Recommendations for an Authentic Experience
1. Ponnusamy Hotel
This is an iconic Chennai establishment famous for its Chettinad cuisine. While it's renowned for its non-vegetarian dishes, its vegetarian food is equally robust and authentic. It perfectly fits your request for a restaurant that isn't pure vegetarian but serves great veg food.

Why Go: For an authentic, spicy, and flavorful Chettinad meal experience.

What to Order: Ask for the Vegetarian Meals. It's an unlimited thali served on a traditional banana leaf with rice, sambar, rasam, poriyal (vegetable stir-fry), kootu (lentil and vegetable stew), and other accompaniments. The flavours are bold and distinctly local.

Vibe: Bustling, no-frills, and focused on the food. It's a true local dining hall experience.

Distance: It's located on Pantheon Road, very close to the museum. You can easily walk there in a few minutes.

2. Mathsya Restaurant
This is an Egmore institution and a fantastic choice if you decide you'd prefer a purely vegetarian restaurant. It's incredibly popular with locals for its Udupi-style South Indian cuisine.

Why Go: Excellent quality, delicious Udupi flavours, and a very lively atmosphere.

What to Order: Their South Indian Thali (or "Meals") is a top choice and very affordable. You could also try their Bisi Bele Bath or a variety of dosas if you want something other than a full thali.

Vibe: Classic, busy, family-friendly vegetarian restaurant. Expect a crowd, which is always a good sign.

Distance: Located on Halls Road, it's just a short walk or a 2-minute auto ride from the museum.

Reliable and Classic Choice
3. Hotel Saravana Bhavan
You can never go wrong with this Chennai-born global chain. It's the benchmark for consistent, high-quality, and hygienic vegetarian food.

Why Go: A vast menu of South Indian classics in a clean, comfortable setting. A very reliable and safe bet.

What to Order: The Saravana Bhavan Meals is a great option. Alternatively, you can order specific dishes like their Parotta with Veg Kurma, or one of their "Variety Rice" options like Lemon Rice or Tamarind Rice, which are staples of Tamil cuisine.

Vibe: Professional, clean, and always busy. It’s a classic family restaurant.

Distance: The Egmore branch is conveniently located and easily accessible from the museum.

Given your request, Ponnusamy Hotel is likely the best fit for a truly local flavour profile in a restaurant that also serves non-vegetarian food. If you want a purely vegetarian place, Mathsya is the perfect local gem.

Enjoy your lunch!`
		},
		{
			role: 'user',
			content: `Done with lunch at masthya. How about a nice, big mall nearby`
		},
		{
			role: 'assistant',
			content: `Of course! You've picked a great time for some shopping. From your location at Mathsya in Egmore, you are very close to one of Chennai's premier malls.

Your Best and Nearest Option:
Express Avenue (EA)

This is exactly the "nice, big mall" you're looking for and it's the most convenient for you. It's a large, modern, and popular shopping centre that's just a short ride from Egmore.

What to Expect: Express Avenue has a huge range of national and international brands, from high-street fashion like H&M and Zara to premium brands, electronics, and cosmetics. It also has a large cinema complex (Escape Cinemas), a massive food court with plenty of options, and dedicated gaming zones.

Vibe: It's a bustling, energetic mall, especially on a Sunday afternoon. You'll find families, groups of friends, and serious shoppers all under one roof. The mall is well-maintained and fully air-conditioned.

Travel Time: From Egmore, it's about a 10-15 minute ride by auto-rickshaw or a cab, depending on the traffic. It is approximately 2-3 km away.

Sunday Hours: It's open until 10:00 PM.

A Classic, Alternative Choice:
Spencer Plaza

If you're interested in a piece of Chennai's history, Spencer Plaza is also very close by. It's one of the oldest shopping malls in India.

What to Expect: The layout is very different from a modern mall. It's a sprawling complex with various blocks and a mix of branded stores and smaller, independent shops selling everything from clothing and accessories to handicrafts and electronics. Anchor stores include Westside and Landmark.

Vibe: It has a more classic, old-world charm compared to Express Avenue. It's less of a single, cohesive building and more of a maze-like collection of shops, which can be an interesting experience in itself.

Travel Time: It's also on Anna Salai (Mount Road) and would take about the same time to reach as Express Avenue, around 10-15 minutes.

Recommendation:

For a guaranteed "nice, big mall" experience with the most variety and a modern feel, head to Express Avenue. If you're feeling a bit more adventurous and want to see a landmark, Spencer Plaza is a worthy alternative.`
		},
		{
			role: 'user',
			content: `I'll spend like an hour there to beat the heat. My train is at 6:40 at chennai beach station. Come up with some nice local snack places I can hit on my way to the station from the mall. The time now is 3:15`
		},
		{
			role: 'assistant',
			content: `Excellent plan! Leaving the mall around 4:15 PM gives you a fantastic window of over two hours to enjoy a local snack and get to Chennai Beach station comfortably. The route from Express Avenue to the station takes you through some of Chennai's most iconic food areas.

Here are a couple of great options for local snacks on your way.

Option 1: The Iconic Street-Side Experience (On the Way)
Go to: Jannal Bajji Kadai (The Window Bajji Shop) in Mylapore

This isn't just a snack spot; it's a quintessential Chennai experience. As the name suggests, it's a small kitchen that serves delicious, hot snacks through a single window on the street.

What to Get: Their specialty is Bajji (vegetables like raw banana, chili, or onion dipped in chickpea flour batter and deep-fried) and Bonda (deep-fried savory potato balls). They are served hot with coconut chutney. It's the perfect local evening snack.

The Vibe: Extremely local and authentic. You'll be standing on the street with other locals, enjoying your snack. It's a quick, grab-and-go experience.

The Plan:

Take an auto or cab from Express Avenue to "Jannal Bajji Kadai, Ponnambala Vathiyar Street, Mylapore." It's near the famous Kapaleeswarar Temple. The ride will take about 15-20 minutes.

Enjoy the hot bajjis (should take about 15-20 minutes).

From there, take another auto/cab to Chennai Beach Station. This will take about 20-25 minutes, taking you along the scenic Marina Beach road.

Option 2: The Bustling Market Feast (Near Your Destination)
Go to: Sowcarpet / George Town

This is the chaotic, vibrant, and delicious market area right next to your destination, Chennai Beach station. It's famous for its street food, particularly North Indian chaat and sweets, which have become a core part of Chennai's local cuisine.

Here are two specific places you can target:

Kakada Ramprasad: A legendary spot famous for its sweets, savories, and chaat. It’s a proper shop where you can sit down.

What to Get: Their Aloo Tikki Chaat, Pav Bhaji, or a plate of hot Jalebi. Don't leave without trying their famous Kesar Badam Milk.

Novelty Tea House: Another classic sit-down restaurant in the area, famous for its Pav Bhaji and other Bombay-style chaat items for decades.

The Vibe: Energetic, crowded, and full of life. It’s a sensory overload in the best way possible.

The Plan:

Take an auto or cab from Express Avenue directly to "Mint Street, Sowcarpet." Tell the driver you want to go to Kakada Ramprasad. This will be a 20-25 minute ride.

Have your snack at Kakada or explore the other chaat stalls nearby.

The best part: From Mint Street, Chennai Beach Station is just a 10-15 minute walk or a 5-minute auto ride away. You can finish your snack and head to the station with zero stress.

Recommendation:
For a uniquely Chennai, quick, and adventurous experience, choose Option 1 (Jannal Bajji Kadai).

For more variety, a place to sit, and the convenience of being right next to your station, choose Option 2 (Sowcarpet).

Given your ample time, you could comfortably do either. Enjoy the local flavors before you catch your train!`
		}
	];
</script>

<div class="my-4 rounded-lg border p-4">
	<span class="text-lg font-bold">Chat transcript</span>
	{#each messages as message}
		{#if message.role === 'assistant'}
			<div class="chat chat-start">
				<div class="chat-image avatar">
					<div class="w-10 rounded-full">
						<Sparkles />
					</div>
				</div>
				<div class="chat-header">
					Gemini
				</div>
				<div class="chat-bubble whitespace-pre-wrap">
                    

                      <div class="collapse">
                        <input type="checkbox" />
                        <div class="collapse-title font-semibold">Click to see the response</div>
                        <div class="collapse-content text-sm">
                            {message.content}
                        </div>
                      </div>
                    
                
                
                </div>
			</div>
		{:else}
			<div class="chat chat-end">
				<div class="chat-image avatar">
					<div class="w-10 rounded-full">
						<User/>
					</div>
				</div>
				<div class="chat-header">
					Anil
				</div>
				<div class="chat-bubble whitespace-pre-wrap">{message.content}</div>
			</div>
		{/if}
	{/each}
</div>
