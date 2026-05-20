import { UploadIcon } from '@phosphor-icons/react'
import { Button } from '../ui/button'

export default function UploadToRoot() {
  return (
    <Button>
      <UploadIcon size={12} />
      Upload to Root
    </Button>
  )
}
