<script>
  import Modal from './Modal.svelte';
  import { t } from '../lib/i18n.svelte.js';
  import { settleConfirm, ui } from '../lib/ui.svelte.js';
</script>

<Modal onclose={() => settleConfirm(false)} labelledby="confirm-msg" size="sm">
  <p id="confirm-msg" class="msg">{ui.confirm?.message}</p>
  <div class="actions">
    <button class="btn btn-ghost" type="button" onclick={() => settleConfirm(false)}>{t('common.cancel')}</button>
    <button class="btn {ui.confirm?.danger ? 'btn-danger' : 'btn-primary'}" type="button" onclick={() => settleConfirm(true)} data-autofocus data-testid="confirm-yes">
      {ui.confirm?.confirmLabel ?? 'OK'}
    </button>
  </div>
</Modal>

<style>
  .msg {
    font-family: var(--font-display);
    font-size: 24px;
    line-height: 1.3;
    padding-right: 30px;
    margin-bottom: 22px;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }
</style>
