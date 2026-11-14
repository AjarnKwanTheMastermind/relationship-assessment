// A small spinning ring, shown inside a button or a loading page while something is being done. Pure CSS (see
// .spinner in globals.css), so it needs no script and works on the static pages too.
export default function Spinner({ large = false }: { large?: boolean }) {
  return <span aria-hidden="true" className={large ? "spinner spinner-lg" : "spinner"} />;
}
