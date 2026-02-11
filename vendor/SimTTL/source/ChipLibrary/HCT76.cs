// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.ConstrainedExecution;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT76.
    /// </summary>
    public class HCT76 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/sn5476.pdf

        private const double TYP_PROPAGATION_DELAY = 15;

        #region Private/Protected Fields
        private SignalState lastClk1;
        private SignalState lastClk2;
        #endregion Private/Protected Fields

        #region FF1 Pins
        public Pin CLK1;
        public Pin PR1n;
        public Pin CLR1n;
        public Pin J1;
        public Pin K1;
        public Pin Q1;
        public Pin Q1n;
        #endregion FF1 Pins

        #region FF2 Pins
        public Pin CLK2;
        public Pin PR2n;
        public Pin CLR2n;
        public Pin J2;
        public Pin K2;
        public Pin Q2;
        public Pin Q2n;
        #endregion FF2 Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT76(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT76(string Name, Net NetCLK1, Net NetPR1n, Net NetCLR1n, Net NetJ1, Net NetK1, Net NetCLK2, Net NetPR2n, Net NetCLR2n, Net NetJ2, Net NetK2) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "5");
            this.Ground[0] = new Pin(this, "GND", "13");

            this.CLK1 = new Pin(this, "CLK1", "1", LineMode.In, SignalState.L, NetCLK1);
            this.PR1n = new Pin(this, "PR1n", "2", LineMode.In, SignalState.L, NetPR1n);
            this.CLR1n = new Pin(this, "CLR1n", "3", LineMode.In, SignalState.L, NetCLR1n);
            this.J1 = new Pin(this, "J1", "4", LineMode.In, SignalState.L, NetJ1);
            this.K1 = new Pin(this, "K1", "16", LineMode.In, SignalState.L, NetK1);
            this.Q1 = new Pin(this, "Q1", "15", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q1n = new Pin(this, "Q1n", "14", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            lastClk1 = SignalState.L;

            this.CLK2 = new Pin(this, "CLK2", "6", LineMode.In, SignalState.L, NetCLK2);
            this.PR2n = new Pin(this, "PR2n", "7", LineMode.In, SignalState.L, NetPR2n);
            this.CLR2n = new Pin(this, "CLR2n", "8", LineMode.In, SignalState.L, NetCLR2n);
            this.J2 = new Pin(this, "J2", "9", LineMode.In, SignalState.L, NetJ2);
            this.K2 = new Pin(this, "K2", "12", LineMode.In, SignalState.L, NetK2);
            this.Q2 = new Pin(this, "Q2", "11", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q2n = new Pin(this, "Q2n", "10", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            lastClk2 = SignalState.L;

            Inputs = new Pin[2][];
            SetPinArray(Inputs, 0, new Pin[] { this.CLK1, this.PR1n, this.CLR1n, this.J1, this.K1 });
            SetPinArray(Inputs, 1, new Pin[] { this.CLK2, this.PR2n, this.CLR2n, this.J2, this.K2 });

            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, new Pin[] { this.Q1, this.Q1n });
            SetPinArray(Outputs, 1, new Pin[] { this.Q2, this.Q2n });
        }
        #endregion Constructors

        #region Private/Protected Methods
        /// <summary>
        /// Implementation of the D-Flip-Flop function.
        /// </summary>
        /// <param name="lastClk">State of the clock pin from the last time.</param>
        /// <param name="CLK">State of the clock pin.</param>
        /// <param name="PRn">Pin to set the output state.</param>
        /// <param name="CLRn">Pin to clear the output state.</param>
        /// <param name="J">J input pin.</param>
        /// <param name="K">K input pin.</param>
        /// <param name="Q">Output pin.</param>
        /// <param name="Qn">Inverted output pin.</param>
        protected void JKFF(ref SignalState lastClk, Pin CLK, Pin PRn, Pin CLRn, Pin J, Pin K, Pin Q, Pin Qn)
        {
            if ((PRn.State == SignalState.L) && (CLRn.State == SignalState.L))
            {
                Q.NewOutState = SignalState.H;
                Qn.NewOutState = SignalState.H;
            }
            else if (PRn.State == SignalState.L)
            {
                Q.NewOutState = SignalState.H;
                Qn.NewOutState = SignalState.L;
            }
            else if (CLRn.State == SignalState.L)
            {
                Q.NewOutState = SignalState.L;
                Qn.NewOutState = SignalState.H;
            }
            else if ((lastClk == SignalState.H) && (CLK.State == SignalState.L))
            {
                if ((J.State == SignalState.H) && (K.State == SignalState.H))
                {
                    Q.NewOutState = Qn.State;
                    Qn.NewOutState = Q.State;
                }
                else if (J.State == SignalState.H)
                {
                    Q.NewOutState = SignalState.H;
                    Qn.NewOutState = SignalState.L;
                }
                else if (K.State == SignalState.H)
                {
                    Q.NewOutState = SignalState.L;
                    Qn.NewOutState = SignalState.H;
                }
            }

            lastClk = CLK.State;
        }
        #endregion Private/Protected Methods

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            JKFF(ref lastClk1, CLK1, PR1n, CLR1n, J1, K1, Q1, Q1n);
            JKFF(ref lastClk2, CLK2, PR2n, CLR2n, J2, K2, Q2, Q2n);
        }
        #endregion Public Methods
    }
}