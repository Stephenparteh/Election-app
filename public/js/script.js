console.log("Hii");

// let role = document.querySelectorAll(".rolee");
// console.log(role);

// role.forEach(function (rolee) {
//   let roole = rolee.value;
//   console.log(roole)
// });

// document.getElementById("register").addEventListener("click", (e) => {
//   e.preventDefault();
//   let oneEle = document.getElementById("party");
//   let twoEle = document.getElementById("position");

//   oneEle.classList.remove("d-none");
//   twoEle.classList.remove("d-none");
// });

{
  /* <script> */
}
document.addEventListener("DOMContentLoaded", function () {
  const roleSelect = document.getElementById("role");
  const partyDiv = document.getElementById("party");
  const positionDiv = document.getElementById("position");

  roleSelect.addEventListener("change", function () {
    const selectedRole = roleSelect.value;

    if (selectedRole === "candidate") {
      partyDiv.classList.remove("d-none");
      positionDiv.classList.remove("d-none");
    } else {
      partyDiv.classList.add("d-none");
      positionDiv.classList.add("d-none");
    }
  });
});
// </script>
