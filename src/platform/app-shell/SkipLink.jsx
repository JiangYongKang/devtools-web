export default function SkipLink({ targetId = 'main-content', label = '跳转到内容' }) {
  return (
    <a href={`#${targetId}`} className="skip-link">
      {label}
    </a>
  )
}
