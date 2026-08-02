<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 400px;">
      <q-card-section>
        <div class="text-h6">Sign In</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <!-- Federated sign-in buttons (shown when Cognito is configured) -->
        <div v-if="cognitoEnabled" class="q-gutter-md q-mb-lg">
          <q-btn
            class="full-width"
            color="red-7"
            icon="img:https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            label="Sign in with Google"
            @click="handleGoogleSignIn"
            unelevated
          />
          <q-btn
            class="full-width"
            color="blue-9"
            icon="mdi-microsoft"
            label="Sign in with Microsoft"
            @click="handleMicrosoftSignIn"
            unelevated
          />

          <q-separator class="q-my-md" />
          <div class="text-caption text-center text-grey-7">
            Or sign in with test credentials (mock mode)
          </div>
        </div>

        <!-- Mock credentials form (always available for development) -->
        <q-form @submit="handleSubmit" class="q-gutter-md">
          <div v-if="!cognitoEnabled" class="q-mb-md">
            <q-banner class="bg-info-1 text-info-9">
              <template v-slot:avatar>
                <q-icon name="info" color="info" />
              </template>
              <div><strong>Mock Mode:</strong> Available test accounts:</div>
              <div class="q-mt-xs">
                <div>• admin@example.com / password</div>
                <div>• john@example.com / password</div>
                <div>• jane@example.com / password</div>
              </div>
            </q-banner>
          </div>

          <q-input
            v-model="form.email"
            label="Email"
            type="email"
            outlined
            dense
            :rules="[
              val => !!val || 'Email is required',
              val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Invalid email format'
            ]"
          />

          <q-input
            v-model="form.password"
            label="Password"
            type="password"
            outlined
            dense
            :rules="[
              val => !!val || 'Password is required',
              val => val.length >= 8 || 'Password must be at least 8 characters'
            ]"
          />

          <div class="row justify-end q-gutter-sm">
            <q-btn
              flat
              label="Cancel"
              color="primary"
              @click="closeDialog"
              :disable="isSubmitting"
            />
            <q-btn
              unelevated
              :label="isSubmitting ? 'Signing In...' : 'Sign In'"
              color="primary"
              type="submit"
              :loading="isSubmitting"
              :disable="!form.email || !form.password"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <div class="text-caption">
          Need access? Contact your team administrator to get invited.
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';
import { isCognitoConfigured, signInWithProvider } from '../services/auth';

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const $q = useQuasar();
const store = useHoodToCoastStore();

const cognitoEnabled = computed(() => isCognitoConfigured);

const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const form = reactive({
  email: '',
  password: ''
});

const isSubmitting = ref(false);

function closeDialog() {
  show.value = false;
  form.email = '';
  form.password = '';
  isSubmitting.value = false;
}

function handleGoogleSignIn() {
  signInWithProvider('Google');
}

function handleMicrosoftSignIn() {
  signInWithProvider('Microsoft');
}

async function handleSubmit() {
  isSubmitting.value = true;

  try {
    const success = await store.signIn(form.email, form.password);

    if (success) {
      $q.notify({
        type: 'positive',
        message: 'Successfully signed in!'
      });
      closeDialog();
    } else {
      $q.notify({
        type: 'negative',
        message: 'Invalid email or password. Please try again.'
      });
    }
  } catch (error) {
    console.error('Sign in error:', error);
    $q.notify({
      type: 'negative',
      message: 'An error occurred during sign in. Please try again.'
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>
