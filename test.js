export default {
  async fetch(request, env) {
    // console.log(env); // 이제 { all_letter: {} }가 잘 보일 거예요.

    try {
      // 1. env.all_letter(바인딩)에서 "all_letter"(KV에 저장한 Key)를 가져옵니다.
      // ⚠️ 주의: KV 대시보드에 저장한 Key 이름이 "all_letter"라면 똑같이 적어야 합니다.
      const data = await env.all_letter.get("all_letter", { type: "json" });

      if (!data) {
        // 만약 KV 대시보드에 "all_letter"라는 Key가 없으면 이 메시지가 뜹니다.
        return new Response(
          "편지 데이터가 없습니다람! 🐿️ (Key 이름을 확인해주세요)",
          { status: 404 },
        );
      }

      // 2. 랜덤으로 하나 뽑기 (500개 데이터가 배열인 경우)
      const randomLetter = data[Math.floor(Math.random() * data.length)];
      console.log("편지 데이터입니다람!: " + JSON.stringify(data));
      return new Response(JSON.stringify(randomLetter), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error) {
      return new Response("에러 발생입니다람!: " + error.message, {
        status: 500,
      });
    }
  },
};
