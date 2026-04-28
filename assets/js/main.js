const toyList = document.querySelector("#toy-list");

const toys = [];

if (toyList && toys.length > 0) {
  toyList.replaceChildren(
    ...toys.map((toy) => {
      const link = document.createElement("a");
      link.className = "toy-link";
      link.href = toy.href;
      link.innerHTML = `
        <span class="toy-dot" aria-hidden="true"></span>
        <span class="toy-name"></span>
        <span class="toy-action">Play</span>
      `;
      link.querySelector(".toy-name").textContent = toy.name;
      return link;
    })
  );
}
